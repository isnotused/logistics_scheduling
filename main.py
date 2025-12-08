from config import PROGRESS_TOTAL_STEPS, RUN_DURATION, PARTITION_TOPOLOGY, CHART_SAVE_PATH
from logger_utils import ProgressLogger  
from data_generator import DataGenerator
from virtual_warehouse import VirtualWarehouse
from adaptive_scheduler import AdaptiveScheduler
from task_processor import TaskProcessor
from resource_matcher import ResourceMatcher
from command_executor import CommandExecutor
from state_corrector import StateCorrector
from chart_generator import chart_generator
import time

def main():
    # 初始化进度日志
    progress_logger = ProgressLogger(PROGRESS_TOTAL_STEPS)
    all_data = {}  
    
    try:
        # 1. 加载数据
        data_gen = DataGenerator()
        order_data = data_gen.generate_order_data(count=10)
        inventory_data = data_gen.generate_inventory_data()
        equipment_status = data_gen.generate_equipment_status()
        topology_data = data_gen.generate_topology_data(PARTITION_TOPOLOGY)
        
        all_data.update({
            "order_data": order_data,
            "inventory_data": inventory_data,
            "equipment_status": equipment_status,
            "topology_data": topology_data
        })
        progress_logger.update_progress(5, "数据加载完成")
        time.sleep(2)
        
        # 2. 构建虚拟仓储模型
        virtual_warehouse = VirtualWarehouse(progress_logger)
        virtual_warehouse.build_model(topology_data, equipment_status)
        virtual_warehouse.inject_real_time_data(inventory_data, order_data)
        
        # 3. 植入自适应调度逻辑核心
        scheduler = AdaptiveScheduler(virtual_warehouse, progress_logger)
        scheduler.implant_core()
        
        # 4. 任务解析
        task_processor = TaskProcessor(virtual_warehouse, progress_logger)
        task_graph = task_processor.process_task_request(order_data)
        all_data["task_graph"] = task_graph
        
        # 5. 资源匹配
        resource_matcher = ResourceMatcher(virtual_warehouse, equipment_status, progress_logger)
        resource_plan = resource_matcher.match_resources(task_graph)
        all_data["resource_plan"] = resource_plan
        
        # 6. 生成控制指令
        control_commands = scheduler.execute_strategy(resource_plan)
        all_data["control_commands"] = control_commands
        
        # 7. 下发指令与采集反馈
        executor = CommandExecutor(virtual_warehouse, progress_logger)
        issued_commands = executor.issue_commands(control_commands)
        feedback_data = executor.collect_feedback(issued_commands)
        all_data["feedback_data"] = feedback_data
        
        # 8. 状态校正
        corrector = StateCorrector(virtual_warehouse, progress_logger)
        deviation_analysis = corrector.calculate_deviation(feedback_data)
        all_data["deviation_analysis"] = deviation_analysis
        over_threshold_count = corrector.calibrate_model()
        
        # 9. 生成数据图表
        progress_logger.update_progress(10, "开始生成数据图表")
        time.sleep(5)
        chart_generator.generate_charts(all_data)
        
        remaining_progress = 100 - progress_logger.current_progress
        if remaining_progress > 0:
            progress_logger.update_progress(remaining_progress, "系统运行全部完成")
        
        # 打印运行总结
        print("\n" + "="*60)
        print("物流仓储智能调度系统运行总结")
        print("="*60)
        print(f"总运行时长：{RUN_DURATION}秒")
        print(f"处理订单数量：{len(order_data)}个")
        print(f"生成原子操作：{len(task_graph)}个")
        print(f"下发控制指令：{len(control_commands)}条")
        print(f"状态超限数量：{over_threshold_count}个")
        print(f"生成图表数量：7张")
        print(f"图表保存路径：{CHART_SAVE_PATH}")
        print("="*60)
        
    except Exception as e:
        progress_logger.logger.error(f"系统运行异常：{str(e)}", exc_info=True)
    finally:
        progress_logger.close()

if __name__ == "__main__":
    main()