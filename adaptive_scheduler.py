import numpy as np
import pandas as pd
from config import SCHEDULING_RULES, SENSITIVITY_THRESHOLD
import time

class AdaptiveScheduler:
    def __init__(self, virtual_warehouse, progress_logger):
        self.virtual_warehouse = virtual_warehouse
        self.rule_base = SCHEDULING_RULES
        self.current_rule = None
        self.state_features = {}
        self.progress_logger = progress_logger 
    
    def implant_core(self):
        """植入自适应调度逻辑核心"""
        self.progress_logger.update_progress(7, "开始植入自适应调度逻辑核心")
        time.sleep(3)
        
        # 初始化策略选择器
        self.progress_logger.update_progress(5, "调度规则库加载完成")
        time.sleep(2)
        
        # 初始化状态特征提取模块
        self.extract_state_features()
        self.progress_logger.update_progress(6, "状态特征提取模块初始化完成")
        time.sleep(3)
        
        # 初始化规则匹配引擎
        self.current_rule = self.match_best_rule()
        self.progress_logger.update_progress(7, f"初始调度规则选定：{self.current_rule}")
        time.sleep(3)
        
        self.progress_logger.update_progress(5, "自适应调度逻辑核心植入完成")
        time.sleep(2)
    
    def extract_state_features(self):
        """提取状态特征向量"""
        # 订单积压程度
        order_count = len(self.virtual_warehouse.current_state.get("订单数据", []))
        order_backlog = order_count / 20
        
        # 设备运行负荷
        equipment_status = self.virtual_warehouse.current_state.get("设备状态", {})
        eq_loads = []
        for eq_id, status in equipment_status.items():
            if status == "正常运行":
                eq_loads.append(np.random.uniform(0.3, 0.9))
        
        avg_eq_load = np.mean(eq_loads) if eq_loads else 0.5
        
        # 路径通行效率
        avg_path_efficiency = self.virtual_warehouse.topology_data["通行效率"].mean() / 100
        
        self.state_features = {
            "订单积压程度": order_backlog,
            "设备平均负荷": avg_eq_load,
            "路径平均通行效率": avg_path_efficiency
        }
    
    def match_best_rule(self):
        """匹配最优调度规则"""
        rule_scores = {
            "优先级规则": self.state_features["订单积压程度"] * 0.6 + self.state_features["设备平均负荷"] * 0.4,
            "路径优化规则": self.state_features["路径平均通行效率"] * 0.7 + (1 - self.state_features["设备平均负荷"]) * 0.3,
            "冲突避让规则": self.state_features["设备平均负荷"] * 0.5 + (1 - self.state_features["路径平均通行效率"]) * 0.5
        }
        
        return max(rule_scores.items(), key=lambda x: x[1])[0]
    
    def check_rule_switch(self):
        """检查规则切换"""
        new_rule = self.match_best_rule()
        if new_rule != self.current_rule:
            # 计算特征变化量
            feature_change = np.mean([
                abs(self.state_features[k] - self.state_features.get(k, 0)) 
                for k in self.state_features
            ])
            
            if feature_change > SENSITIVITY_THRESHOLD:
                self.current_rule = new_rule
                self.progress_logger.update_progress(2, f"调度规则动态切换为：{self.current_rule}")
                time.sleep(1)
    
    def execute_strategy(self, resource_plan):
        """策略执行器：生成控制指令序列"""
        self.progress_logger.update_progress(8, "策略执行器激活，开始生成控制指令序列")
        time.sleep(4)
        
        control_commands = []
        for _, plan in resource_plan.iterrows():
            command = {
                "指令ID": f"CMD{2025001 + len(control_commands)}",
                "任务ID": plan["任务ID"],
                "原子操作": plan["原子操作"],
                "分配设备": plan["分配设备"],
                "执行时间": plan["执行时间"],
                "执行参数": {
                    "目标位置": plan["目标位置"],
                    "路径选择": self._select_optimal_path(plan["当前分区"], plan["目标位置"]),
                    "优先级": self._get_task_priority(plan["任务类型"])
                },
                "时序约束": f"必须在{plan['执行时间']}前启动，执行时长不超过{np.random.randint(3, 10)}分钟"
            }
            control_commands.append(command)
        
        self.progress_logger.update_progress(7, "控制指令序列生成完成")
        time.sleep(3)
        return pd.DataFrame(control_commands)
    
    def _select_optimal_path(self, source, target):
        """选择最优路径（基于拓扑关系）"""
        if source == target:
            return [source]

        paths = self.virtual_warehouse.topology_data[
            (self.virtual_warehouse.topology_data["源分区"] == source) |
            (self.virtual_warehouse.topology_data["目标分区"] == target)
        ]
        return [source, target] if not paths.empty else [source, "缓冲区域", target]
    
    def _get_task_priority(self, task_type):
        """获取任务优先级"""
        priority_map = {"超时订单": 1, "紧急订单": 2, "普通订单": 3}
        return priority_map.get(task_type, 3)