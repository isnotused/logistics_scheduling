import pandas as pd
import numpy as np
from config import STATE_DEVIATION_THRESHOLD
import time

class StateCorrector:
    def __init__(self, virtual_warehouse, progress_logger):
        self.virtual_warehouse = virtual_warehouse
        self.deviation_analysis = pd.DataFrame()
        self.progress_logger = progress_logger  
    
    def calculate_deviation(self, feedback_data):
        """计算状态偏差值"""
        self.progress_logger.update_progress(7, "开始计算状态偏差值")
        time.sleep(3)
        
        deviation_results = []
        for _, feedback in feedback_data.iterrows():
            predicted_position = self.virtual_warehouse.current_state["设备状态"].get(
                feedback["设备ID"], "未知"
            )
            predicted_progress = 85  # 预测完成进度
            
            # 计算关键变量偏差
            position_deviation = 1 if feedback["当前位置"] != predicted_position else 0
            progress_deviation = abs(feedback["任务完成进度"] - predicted_progress) / 100
            
            # 加权平均计算综合偏差
            comprehensive_deviation = (position_deviation * 0.3 + progress_deviation * 0.7) * 10
            
            deviation_results.append({
                "设备ID": feedback["设备ID"],
                "指令ID": feedback["指令ID"],
                "位置偏差": position_deviation,
                "进度偏差": progress_deviation,
                "综合偏差值": comprehensive_deviation,
                "是否超限": comprehensive_deviation > STATE_DEVIATION_THRESHOLD
            })
        
        self.deviation_analysis = pd.DataFrame(deviation_results)
        self.progress_logger.update_progress(6, "状态偏差值计算完成")
        time.sleep(3)
        
        return self.deviation_analysis
    
    def calibrate_model(self):
        """校准虚拟仓储模型状态"""
        self.progress_logger.update_progress(8, "开始校准虚拟仓储模型状态")
        time.sleep(4)
        
        # 统计超限情况
        over_threshold_count = self.deviation_analysis["是否超限"].sum()
        self.progress_logger.update_progress(4, f"共发现{over_threshold_count}个超限状态")
        time.sleep(2)
        
        # 更新模型状态
        state_updates = {}
        for _, dev in self.deviation_analysis.iterrows():
            if dev["是否超限"]:
                # 更新设备位置
                self.virtual_warehouse.current_state["设备状态"][dev["设备ID"]] = "需要校准"
        
        self.progress_logger.update_progress(5, "虚拟仓储模型状态校准完成")
        time.sleep(3)
        
        return over_threshold_count