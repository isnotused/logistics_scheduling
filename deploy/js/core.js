/**
 * 核心业务逻辑库 - 生产环境版
 * 移植自 Python 项目: 任务解析、资源匹配、状态校正、数据生成、虚拟仓储
 */

const CONFIG = {
    // 逻辑分区定义 (参考 virtual_warehouse.py / config.py)
    LOGICAL_PARTITIONS: ["A区", "B区", "C区", "D区", "E区", "缓冲区域", "作业站台"],
    PARTITION_TOPOLOGY: {
        "A区": ["B区", "缓冲区域"],
        "B区": ["A区", "C区", "作业站台"],
        "C区": ["B区", "D区"],
        "D区": ["C区", "E区", "缓冲区域"],
        "E区": ["D区", "作业站台"],
        "缓冲区域": ["A区", "D区", "作业站台"],
        "作业站台": ["B区", "E区", "缓冲区域"]
    },
    EQUIPMENTS: {
        "AGV小车": ["AGV1", "AGV2", "AGV3"],
        "堆垛机": ["堆垛机1", "堆垛机2"],
        "分拣装置": ["分拣装置1", "分拣装置2"]
    },
    SCHEDULING_RULES: {
        "优先级规则": "紧急订单优先级高于普通订单，超时订单优先级最高",
        "路径优化规则": "选择拓扑距离最短且通行效率最高的路径",
        "冲突避让规则": "同一路径同一时间窗内仅允许一台移动设备通行"
    },
    THRESHOLDS: {
        STATE_DEVIATION: 5.0,
        SENSITIVITY: 0.3
    }
};

/**
 * 虚拟仓储模型 (对应 VirtualWarehouse)
 * 维护系统状态：分区、设备、库存
 */
class VirtualWarehouse {
    constructor() {
        this.current_state = {
            "分区状态": {},
            "设备状态": {},
            "库存状态": {},
            "订单数据": []
        };
        this.topology_data = [];
        this.init();
    }

    init() {
        // 初始化分区状态
        CONFIG.LOGICAL_PARTITIONS.forEach(p => {
            this.current_state["分区状态"][p] = "正常";
            this.current_state["库存状态"][p] = {}; // 存储物料数量
        });
    }

    updateEquipmentState(eqId, status, location, load) {
        if (!this.current_state["设备状态"][eqId]) {
            this.current_state["设备状态"][eqId] = {};
        }
        this.current_state["设备状态"][eqId] = { status, location, load };
    }
}

/**
 * 数据生成器 (对应 DataGenerator)
 * 模拟生产环境的实时数据流
 */
class DataGenerator {
    constructor() {
        this.orderCounter = 2025001;
    }

    generateOrder() {
        const orderTypes = ["紧急订单", "普通订单", "超时订单"];
        const materials = ["电子元件", "机械零件", "包装材料", "化工原料", "食品原料"];
        const targetLocations = CONFIG.LOGICAL_PARTITIONS.slice(0, -2); // 排除缓冲和站台作为最终目标

        const type = Math.random() < 0.2 ? "紧急订单" : (Math.random() < 0.2 ? "超时订单" : "普通订单");
        
        return {
            "订单ID": `ORD${this.orderCounter++}`,
            "物料名称": materials[Math.floor(Math.random() * materials.length)],
            "目标位置": targetLocations[Math.floor(Math.random() * targetLocations.length)],
            "订单类型": type,
            "创建时间": new Date().toLocaleString(),
            "要求完成时间": new Date(Date.now() + 3600000).toLocaleString() // +1 hour
        };
    }

    generateEquipmentStatus() {
        const statusList = ["正常运行", "忙碌", "轻微故障"];
        const equipmentList = [];

        for (const [type, names] of Object.entries(CONFIG.EQUIPMENTS)) {
            names.forEach(name => {
                equipmentList.push({
                    "设备类型": type,
                    "设备ID": name,
                    "运行状态": "正常运行", // 初始状态
                    "当前位置": CONFIG.LOGICAL_PARTITIONS[Math.floor(Math.random() * CONFIG.LOGICAL_PARTITIONS.length)],
                    "运行负荷": Math.floor(Math.random() * 40) + 10, // 初始 10-50%
                    "累计运行时间": Math.floor(Math.random() * 5000),
                    "isOnline": true
                });
            });
        }
        return equipmentList;
    }
}

/**
 * 任务解析模块 (对应 TaskProcessor)
 * 将订单分解为原子操作
 */
class TaskProcessor {
    process(order) {
        // 原子操作定义: 物料定位 -> 路径规划 -> 设备调度 -> 物料搬运 -> 库存更新 -> 任务确认
        const atomicOperations = [
            { name: "物料定位", type: "数据处理" },
            { name: "路径规划", type: "计算" },
            { name: "设备调度", type: "决策" },
            { name: "物料搬运", type: "物理执行" },
            { name: "库存更新", type: "数据处理" },
            { name: "任务确认", type: "通信" }
        ];

        const steps = atomicOperations.map((op, index) => ({
            "任务ID": order["订单ID"],
            "物料名称": order["物料名称"],
            "目标位置": order["目标位置"],
            "原子操作": op.name,
            "操作类型": op.type,
            "操作序号": index + 1,
            "状态": "Pending",
            "进度": 0
        }));

        return steps;
    }
}

/**
 * 资源匹配模块 (对应 ResourceMatcher)
 * 为原子操作分配设备
 */
class ResourceMatcher {
    match(taskStep, equipmentList) {
        // 简化逻辑：根据操作类型分配设备
        // 物料搬运 -> AGV小车 / 堆垛机
        // 其他 -> 系统/控制中心 (这里为了演示效果，把计算类也分配给设备或虚拟节点)
        
        let reqType = null;
        if (taskStep["原子操作"] === "物料搬运") {
            reqType = Math.random() > 0.5 ? "AGV小车" : "堆垛机";
        } else if (["物料定位", "库存更新"].includes(taskStep["原子操作"])) {
            reqType = "堆垛机"; // 假设堆垛机有扫描功能
        } else if (taskStep["原子操作"] === "路径规划") {
            reqType = "AGV小车"; // AGV 自己规划或由中控分配
        } else {
            reqType = "分拣装置"; // 兜底
        }

        const candidates = equipmentList.filter(e => e["设备类型"] === reqType && e["运行状态"] !== "故障");
        if (candidates.length > 0) {
            // 简单的负载均衡：选负载最小的
            candidates.sort((a, b) => a["运行负荷"] - b["运行负荷"]);
            return candidates[0]["设备ID"];
        }
        return "等待资源";
    }
}

/**
 * 自适应调度器 (对应 AdaptiveScheduler)
 * 选择最优规则 (简化版)
 */
class AdaptiveScheduler {
    selectRule(features) {
        // features: { backlog, avgLoad, pathEfficiency }
        // 简单模拟权重打分
        const scores = {
            "优先级规则": features.backlog * 0.6 + features.avgLoad * 0.4,
            "路径优化规则": features.pathEfficiency * 0.7 + (1 - features.avgLoad) * 0.3,
            "冲突避让规则": features.avgLoad * 0.5 + (1 - features.pathEfficiency) * 0.5
        };
        return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    }
}

/**
 * 状态校正模块 (对应 StateCorrector)
 */
class StateCorrector {
    checkAndCalibrate(equipment, feedback) {
        // 计算综合偏差
        // 简单模拟：如果反馈位置 != 预期位置，产生偏差
        let deviation = 0;
        if (feedback.location && feedback.location !== equipment["当前位置"]) {
            deviation += 3.0;
        }
        // 进度偏差
        deviation += Math.random() * 2; // 随机波动

        if (deviation > CONFIG.THRESHOLDS.STATE_DEVIATION) {
            return { required: true, msg: `设备 ${equipment["设备ID"]} 状态偏差 ${deviation.toFixed(1)}，已执行自动校准` };
        }
        return { required: false };
    }
}

window.ProductionCore = {
    CONFIG,
    VirtualWarehouse,
    DataGenerator,
    TaskProcessor,
    ResourceMatcher,
    AdaptiveScheduler,
    StateCorrector
};
