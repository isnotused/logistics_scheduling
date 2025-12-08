import pandas as pd
import time

class TaskProcessor:
    def __init__(self, virtual_warehouse, progress_logger):
        self.virtual_warehouse = virtual_warehouse
        self.task_decomposition_graph = []
        self.progress_logger = progress_logger  
    
    def process_task_request(self, order_data):
        """处理任务请求，生成任务分解图谱"""
        self.progress_logger.update_progress(6, "开始处理任务请求，进行多维度任务解析")
        time.sleep(3)
        
        decomposition_results = []
        atomic_operations = [
            "物料定位", "路径规划", "设备调度", "物料搬运", "库存更新", "任务确认"
        ]
        
        for _, order in order_data.iterrows():
            # 识别涉及的逻辑分区
            related_partitions = [
                self.virtual_warehouse.current_state["库存状态"][p].get("逻辑分区")
                for p in self.virtual_warehouse.current_state["库存状态"]
                if self.virtual_warehouse.current_state["库存状态"][p].get(order["物料名称"], 0) > 0
            ] + [order["目标位置"]]
            related_partitions = list(set(related_partitions))
            
            # 分解为原子操作
            for i, op in enumerate(atomic_operations):
                decomposition_results.append({
                    "任务ID": order["订单ID"],
                    "物料名称": order["物料名称"],
                    "目标位置": order["目标位置"],
                    "订单类型": order["订单类型"],
                    "原子操作": op,
                    "操作序号": i + 1,
                    "涉及分区": ",".join(related_partitions),
                    "操作依赖": atomic_operations[i-1] if i > 0 else "无"
                })
        
        self.task_decomposition_graph = pd.DataFrame(decomposition_results)
        self.progress_logger.update_progress(7, "任务分解完成，生成任务分解图谱")
        time.sleep(3)
        
        return self.task_decomposition_graph