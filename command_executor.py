import pandas as pd
import numpy as np
from datetime import datetime
import time

class CommandExecutor:
    def __init__(self, virtual_warehouse, progress_logger):
        self.virtual_warehouse = virtual_warehouse
        self.feedback_data = pd.DataFrame()
        self.progress_logger = progress_logger  
    
    def issue_commands(self, control_commands):
        """下发控制指令序列"""
        self.progress_logger.update_progress(9, "开始向物理执行终端下发控制指令")
        time.sleep(4)
        
        # 指令下发
        issued_commands = control_commands.copy()
        issued_commands["下发状态"] = "已下发"
        issued_commands["下发时间"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        self.progress_logger.update_progress(8, f"共下发{len(issued_commands)}条控制指令")
        time.sleep(3)
        
        return issued_commands
    
    def collect_feedback(self, issued_commands):
        """采集物理执行终端反馈数据流"""
        self.progress_logger.update_progress(10, "开始采集物理执行终端反馈数据")
        time.sleep(5)
        
        feedback_data = []
        status_codes = [200, 200, 200, 201, 202]  
        for _, cmd in issued_commands.iterrows():
            feedback = {
                "指令ID": cmd["指令ID"],
                "任务ID": cmd["任务ID"],
                "设备ID": cmd["分配设备"],
                "状态码": np.random.choice(status_codes, p=[0.6, 0.2, 0.1, 0.05, 0.05]),
                "当前位置": np.random.choice(self.virtual_warehouse.logical_partitions),
                "任务完成进度": np.random.randint(70, 100),
                "反馈时间": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "异常信息": "" if np.random.random() > 0.1 else "轻微路径偏差"
            }
            feedback_data.append(feedback)
        
        self.feedback_data = pd.DataFrame(feedback_data)
        self.progress_logger.update_progress(9, "反馈数据采集完成")
        time.sleep(4)
        
        return self.feedback_data