import pandas as pd
from config import LOGICAL_PARTITIONS, PARTITION_TOPOLOGY, EQUIPMENTS
import time

class VirtualWarehouse:
    def __init__(self, progress_logger):
        self.logical_partitions = []
        self.partition_mapping = pd.DataFrame()  
        self.topology_data = pd.DataFrame()
        self.current_state = {}  
        self.progress_logger = progress_logger  
    
    def build_model(self, topology_data, equipment_status):
        """构建虚拟仓储模型"""
        self.progress_logger.update_progress(5, "开始构建虚拟仓储模型")
        time.sleep(3)  
        
        # 初始化逻辑分区
        self.logical_partitions = LOGICAL_PARTITIONS
        self.progress_logger.update_progress(3, "逻辑分区初始化完成")
        time.sleep(2)
        
        # 构建拓扑关系
        self.topology_data = topology_data
        self.progress_logger.update_progress(4, "分区拓扑关系构建完成")
        time.sleep(2)
        
        # 建立设备-分区映射关系
        mapping_data = []
        for _, eq in equipment_status.iterrows():
            mapping_data.append({
                "设备ID": eq["设备ID"],
                "设备类型": eq["设备类型"],
                "关联分区": eq["当前位置"],
                "属性标识码": f"{eq['设备类型']}_{eq['设备ID']}_{eq['当前位置']}"
            })
        self.partition_mapping = pd.DataFrame(mapping_data)
        self.progress_logger.update_progress(3, "设备-分区映射表建立完成")
        time.sleep(2)
        
        # 初始化模型状态
        self.current_state = {
            "分区状态": {p: "正常" for p in self.logical_partitions},
            "设备状态": equipment_status.set_index("设备ID")["运行状态"].to_dict(),
            "库存状态": {}  
        }
        self.progress_logger.update_progress(5, "虚拟仓储模型构建完成")
        time.sleep(3)
    
    def inject_real_time_data(self, inventory_data, order_data):
        """注入实时运行数据流"""
        self.progress_logger.update_progress(6, "开始注入实时运行数据流")
        time.sleep(3)
        
        # 更新库存状态
        for _, inv in inventory_data.iterrows():
            partition = inv["逻辑分区"]
            self.current_state["库存状态"][partition] = inv.to_dict()
        self.progress_logger.update_progress(4, "库存数据同步完成")
        time.sleep(2)
        
        # 更新订单数据
        self.current_state["订单数据"] = order_data.to_dict("records")
        self.progress_logger.update_progress(4, "订单数据同步完成")
        time.sleep(2)
        
        # 触发状态刷新
        self.progress_logger.update_progress(6, "实时数据注入完成，仓储动态孪生体激活")
        time.sleep(3)
    
    def get_partition_state(self, partition):
        """获取分区状态"""
        return self.current_state["分区状态"].get(partition, "未知")
    
    def update_state(self, state_updates):
        """更新模型状态"""
        self.current_state.update(state_updates)