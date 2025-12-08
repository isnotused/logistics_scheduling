/**
 * 核心业务逻辑库 - 生产环境版
 * 移植自 Python 项目: 任务解析、资源匹配、状态校正
 */

const CONFIG = {
    // 逻辑分区定义 (参考 virtual_warehouse.py)
    PARTITIONS: ["A1", "A2", "A3", "A4", "A5", "Buffer_Area", "Docking_Station"],
    // 偏差阈值 (参考 config.py)
    THRESHOLDS: {
        DEVIATION: 5.0,
        SENSITIVITY: 0.3
    }
};

/**
 * 任务解析模块 (对应 TaskParsingModule)
 * 将订单请求分解为原子操作步骤
 */
class TaskParser {
    decompose(order) {
        // 模拟生成任务分解图谱
        // 订单 -> [移动到货架] -> [取货] -> [移动到站台] -> [卸货]
        const steps = [];
        const baseId = order.id.replace('ORD', 'TSK');
        
        steps.push({
            id: `${baseId}-01`,
            orderId: order.id,
            type: "MOVE_TO_SOURCE",
            desc: `移动至分区 [${order.source}]`,
            progress: 0,
            status: "Pending"
        });
        
        steps.push({
            id: `${baseId}-02`,
            orderId: order.id,
            type: "PICK_ITEM",
            desc: `抓取物料 [${order.material}]`,
            progress: 0,
            status: "Pending"
        });

        steps.push({
            id: `${baseId}-03`,
            orderId: order.id,
            type: "TRANSPORT",
            desc: `运输至 [${order.target}]`,
            progress: 0,
            status: "Pending"
        });

        return steps;
    }
}

/**
 * 资源匹配模块 (对应 ResourceMatchingModule)
 * 基于状态和距离分配设备
 */
class ResourceMatcher {
    match(step, resources) {
        // 筛选可用资源
        const candidates = resources.filter(r => r.status === "Idle" && r.isOnline);
        
        if (candidates.length === 0) return null;

        // 简单模拟路径优化：随机选择一个“最近”的空闲设备
        // 在真实场景中这里会计算拓扑距离
        const bestResource = candidates[Math.floor(Math.random() * candidates.length)];
        
        return bestResource;
    }
}

/**
 * 状态校正模块 (对应 StateCorrectionModule)
 * 监控设备状态偏差，触发自动校准
 */
class StateCorrector {
    check(resource) {
        // 模拟传感器反馈数据流对比
        // 产生一个随机偏差值 (-2% 到 +2%)
        const drift = (Math.random() - 0.5) * 4;
        
        // 更新资源的"理论"位置与"实际"位置偏差
        resource.deviation = Math.abs(drift);

        // 如果偏差超过阈值，触发校正
        if (resource.deviation > CONFIG.THRESHOLDS.DEVIATION) {
            this.calibrate(resource);
            return { calibrated: true, msg: `设备 ${resource.id} 偏差过大 (${resource.deviation.toFixed(2)}), 已自动校准` };
        }
        return { calibrated: false };
    }

    calibrate(resource) {
        resource.deviation = 0.1; // 重置偏差
        // 模拟参数校准流程
        console.log(`[System] Calibrated device ${resource.id}`);
    }
}

/**
 * 数据生成器 (模拟底层 PLC/WCS 信号)
 */
class SignalGenerator {
    constructor() {
        this.orderCounter = 1000;
    }

    generateInputSignal() {
        const materials = ["电子元件-X1", "汽车配件-P2", "食品原料-F5", "危化品-C9", "图书档案-B3"];
        const sources = ["A1", "A2", "A3"];
        const targets = ["Buffer_Area", "Docking_Station"];

        this.orderCounter++;
        return {
            id: `ORD-${this.orderCounter}`,
            material: materials[Math.floor(Math.random() * materials.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
            target: targets[Math.floor(Math.random() * targets.length)],
            priority: Math.random() > 0.85 ? "Urgent" : "Normal",
            timestamp: new Date().getTime()
        };
    }

    initHardwareStatus() {
        // 初始化设备列表
        return [
            { id: "AGV-001", type: "AGV", status: "Idle", load: 0, location: "A1", battery: 98, isOnline: true, deviation: 0 },
            { id: "AGV-002", type: "AGV", status: "Idle", load: 0, location: "Station", battery: 85, isOnline: true, deviation: 0 },
            { id: "AGV-003", type: "AGV", status: "Idle", load: 0, location: "A2", battery: 92, isOnline: true, deviation: 0 },
            { id: "STK-101", type: "Stacker", status: "Idle", load: 0, location: "A3", battery: 100, isOnline: true, deviation: 0 },
            { id: "STK-102", type: "Stacker", status: "Idle", load: 0, location: "A4", battery: 100, isOnline: true, deviation: 0 },
            { id: "SRT-201", type: "Sorter", status: "Idle", load: 0, location: "Buffer", battery: 100, isOnline: true, deviation: 0 }
        ];
    }
}

window.ProductionCore = {
    TaskParser,
    ResourceMatcher,
    StateCorrector,
    SignalGenerator,
    CONFIG
};
