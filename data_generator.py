import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from config import LOGICAL_PARTITIONS, EQUIPMENTS

class DataGenerator:
    def generate_order_data(self, count=10):
        """生成订单数据"""
        order_types = ["紧急订单", "普通订单", "超时订单"]
        materials = ["电子元件", "机械零件", "包装材料", "化工原料", "食品原料"]
        target_locations = LOGICAL_PARTITIONS[:-2]  
        
        data = {
            "订单ID": [f"ORD{2025001 + i}" for i in range(count)],
            "物料名称": np.random.choice(materials, count),
            "目标位置": np.random.choice(target_locations, count),
            "订单类型": np.random.choice(order_types, count, p=[0.2, 0.6, 0.2]),
            "要求完成时间": [datetime.now() + timedelta(minutes=np.random.randint(10, 60)) for _ in range(count)],
            "创建时间": [datetime.now() - timedelta(minutes=np.random.randint(0, 30)) for _ in range(count)]
        }
        return pd.DataFrame(data)
    
    def generate_inventory_data(self):
        """生成库存数据"""
        materials = ["电子元件", "机械零件", "包装材料", "化工原料", "食品原料"]
        data = {
            "逻辑分区": LOGICAL_PARTITIONS[:-2],  
            **{material: np.random.randint(50, 500) for material in materials}
        }
        return pd.DataFrame(data)
    
    def generate_equipment_status(self):
        """生成设备状态数据"""
        equipment_list = []
        status_list = ["正常运行", "忙碌", "轻微故障"]
        
        for eq_type, eq_names in EQUIPMENTS.items():
            for eq_name in eq_names:
                equipment_list.append({
                    "设备类型": eq_type,
                    "设备ID": eq_name,
                    "运行状态": np.random.choice(status_list, p=[0.6, 0.3, 0.1]),
                    "当前位置": np.random.choice(LOGICAL_PARTITIONS),
                    "运行负荷": np.random.randint(30, 95),  
                    "累计运行时间": np.random.randint(100, 5000),  
                    "最后维护时间": datetime.now() - timedelta(days=np.random.randint(1, 30))
                })
        
        return pd.DataFrame(equipment_list)
    
    def generate_topology_data(self, topology):
        """生成拓扑关系数据"""
        data = []
        for source, targets in topology.items():
            for target in targets:
                data.append({
                    "源分区": source,
                    "目标分区": target,
                    "路径长度": np.random.randint(10, 50),  
                    "通行效率": np.random.randint(70, 98)   
                })
        return pd.DataFrame(data)