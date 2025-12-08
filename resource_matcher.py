import pandas as pd
from datetime import datetime, timedelta
import numpy as np
import time

class ResourceMatcher:
    def __init__(self, virtual_warehouse, equipment_status, progress_logger):
        self.virtual_warehouse = virtual_warehouse
        self.equipment_status = equipment_status
        self.resource_plan = pd.DataFrame()
        self.progress_logger = progress_logger  
    
    def match_resources(self, task_graph):
        """资源匹配运算，生成资源匹配方案"""
        self.progress_logger.update_progress(8, "开始资源匹配运算")
        time.sleep(4)
        
        resource_plan = []
        equipment_map = self.equipment_status.groupby("设备类型")["设备ID"].apply(list).to_dict()
        
        for _, task in task_graph.iterrows():
            # 确定所需设备类型
            op = task["原子操作"]
            if op in ["物料定位", "库存更新"]:
                req_equipment_type = "堆垛机"
            elif op in ["路径规划", "物料搬运"]:
                req_equipment_type = "AGV小车"
            else:
                req_equipment_type = "分拣装置"
            
            # 选择可用设备
            available_equipment = [
                eq for eq in equipment_map[req_equipment_type]
                if self.virtual_warehouse.current_state["设备状态"][eq] == "正常运行"
            ]
            assigned_equipment = available_equipment[0] if available_equipment else equipment_map[req_equipment_type][0]
            
            # 确定执行时间
            execute_time = datetime.now() + timedelta(minutes=task["操作序号"] * 2)
            
            # 确定当前分区
            current_partition = self.equipment_status[
                self.equipment_status["设备ID"] == assigned_equipment
            ]["当前位置"].iloc[0]
            
            resource_plan.append({
                "任务ID": task["任务ID"],
                "物料名称": task["物料名称"],
                "目标位置": task["目标位置"],
                "任务类型": task["订单类型"],
                "原子操作": task["原子操作"],
                "操作序号": task["操作序号"],
                "当前分区": current_partition,
                "分配设备": assigned_equipment,
                "设备类型": req_equipment_type,
                "执行时间": execute_time.strftime("%Y-%m-%d %H:%M:%S"),
                "资源状态": "已分配"
            })
        
        self.resource_plan = pd.DataFrame(resource_plan)
        self.progress_logger.update_progress(7, "资源匹配运算完成，生成资源匹配方案")
        time.sleep(3)
        
        return self.resource_plan