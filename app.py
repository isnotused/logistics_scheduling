from flask import Flask, render_template, send_from_directory, jsonify, request, redirect, url_for
import os
from config import PROGRESS_TOTAL_STEPS, PARTITION_TOPOLOGY, CHART_SAVE_PATH
from logger_utils import ProgressLogger
from data_generator import DataGenerator
from virtual_warehouse import VirtualWarehouse
from adaptive_scheduler import AdaptiveScheduler
from task_processor import TaskProcessor
from resource_matcher import ResourceMatcher
from command_executor import CommandExecutor
from state_corrector import StateCorrector
from chart_generator import chart_generator
import pandas as pd

app = Flask(__name__)
app.secret_key = 'logistics_scheduling_secret_key'

# Store system state globally
system_state = {
    "all_data": {},
    "is_initialized": False
}

def run_simulation():
    """Run the logistics scheduling simulation to populate data."""
    if system_state["is_initialized"]:
        return

    progress_logger = ProgressLogger(PROGRESS_TOTAL_STEPS)
    all_data = {}
    
    try:
        # 1. Load Data
        data_gen = DataGenerator()
        order_data = data_gen.generate_order_data(count=20) # Increased for demo
        inventory_data = data_gen.generate_inventory_data()
        equipment_status = data_gen.generate_equipment_status()
        topology_data = data_gen.generate_topology_data(PARTITION_TOPOLOGY)
        
        all_data.update({
            "order_data": order_data,
            "inventory_data": inventory_data,
            "equipment_status": equipment_status,
            "topology_data": topology_data
        })
        progress_logger.update_progress(5, "Data Loading Completed")
        
        # 2. Build Virtual Warehouse
        virtual_warehouse = VirtualWarehouse(progress_logger)
        virtual_warehouse.build_model(topology_data, equipment_status)
        virtual_warehouse.inject_real_time_data(inventory_data, order_data)
        
        # 3. Implant Adaptive Scheduler
        scheduler = AdaptiveScheduler(virtual_warehouse, progress_logger)
        scheduler.implant_core()
        
        # 4. Task Processing
        task_processor = TaskProcessor(virtual_warehouse, progress_logger)
        task_graph = task_processor.process_task_request(order_data)
        all_data["task_graph"] = task_graph
        
        # 5. Resource Matching
        resource_matcher = ResourceMatcher(virtual_warehouse, equipment_status, progress_logger)
        resource_plan = resource_matcher.match_resources(task_graph)
        all_data["resource_plan"] = resource_plan
        
        # 6. Generate Control Commands
        control_commands = scheduler.execute_strategy(resource_plan)
        all_data["control_commands"] = control_commands
        
        # 7. Issue Commands and Collect Feedback
        executor = CommandExecutor(virtual_warehouse, progress_logger)
        issued_commands = executor.issue_commands(control_commands)
        feedback_data = executor.collect_feedback(issued_commands)
        all_data["feedback_data"] = feedback_data
        
        # 8. State Correction
        corrector = StateCorrector(virtual_warehouse, progress_logger)
        deviation_analysis = corrector.calculate_deviation(feedback_data)
        all_data["deviation_analysis"] = deviation_analysis
        corrector.calibrate_model()
        
        # 9. Generate Charts
        progress_logger.update_progress(10, "Generating Charts")
        chart_generator.generate_charts(all_data)
        
        system_state["all_data"] = all_data
        system_state["is_initialized"] = True
        
    except Exception as e:
        print(f"Simulation failed: {e}")
    finally:
        progress_logger.close()

# Run simulation on startup
run_simulation()

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Simple login for demonstration
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    all_data = system_state["all_data"]
    if not all_data:
        return "System initializing...", 503
        
    # Summarize data for dashboard
    summary = {
        "total_orders": len(all_data.get("order_data", [])),
        "total_tasks": len(all_data.get("task_graph", [])),
        "resources_active": len(all_data.get("equipment_status", [])),
        "alerts": len(all_data.get("deviation_analysis", []))
    }
    return render_template('dashboard.html', summary=summary)

@app.route('/tasks')
def tasks():
    all_data = system_state["all_data"]
    tasks_df = all_data.get("resource_plan", pd.DataFrame())
    # Convert DataFrame to list of dicts for template
    tasks_list = tasks_df.to_dict('records') if not tasks_df.empty else []
    return render_template('tasks.html', tasks=tasks_list)

@app.route('/resources')
def resources():
    all_data = system_state["all_data"]
    equipment_df = all_data.get("equipment_status", pd.DataFrame())
    resources_list = equipment_df.to_dict('records') if not equipment_df.empty else []
    return render_template('resources.html', resources=resources_list)

@app.route('/analysis')
def analysis():
    # List available charts
    charts = [f for f in os.listdir(CHART_SAVE_PATH) if f.endswith('.png')]
    return render_template('analysis.html', charts=charts)

@app.route('/charts/<path:filename>')
def serve_charts(filename):
    return send_from_directory(CHART_SAVE_PATH, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

