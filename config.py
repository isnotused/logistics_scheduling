# 逻辑分区配置
LOGICAL_PARTITIONS = ["A1", "A2", "A3", "A4", "A5", "缓冲区域", "作业站台"]
PARTITION_TOPOLOGY = {
    "A1": ["A2", "缓冲区域"],
    "A2": ["A1", "A3", "作业站台"],
    "A3": ["A2", "A4"],
    "A4": ["A3", "A5", "缓冲区域"],
    "A5": ["A4", "作业站台"],
    "缓冲区域": ["A1", "A4", "作业站台"],
    "作业站台": ["A2", "A5", "缓冲区域"]
}

# 设备配置
EQUIPMENTS = {
    "AGV小车": ["AGV1", "AGV2", "AGV3"],
    "堆垛机": ["堆垛机1", "堆垛机2"],
    "分拣装置": ["分拣装置1", "分拣装置2"]
}

# 调度规则库
SCHEDULING_RULES = {
    "优先级规则": "紧急订单优先级高于普通订单，超时订单优先级最高",
    "路径优化规则": "选择拓扑距离最短且通行效率最高的路径",
    "冲突避让规则": "同一路径同一时间窗内仅允许一台移动设备通行"
}

# 阈值配置
STATE_DEVIATION_THRESHOLD = 5.0  
SENSITIVITY_THRESHOLD = 0.3     
PROGRESS_TOTAL_STEPS = 100      
RUN_DURATION = 60                

# 图表配置
CHART_SAVE_PATH = "charts/"
FONT_NAME = "SimHei"
CHART_DPI = 150