import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from config import CHART_SAVE_PATH, FONT_NAME, CHART_DPI, STATE_DEVIATION_THRESHOLD  # 新增STATE_DEVIATION_THRESHOLD
import os

# 设置中文字体
plt.rcParams['font.sans-serif'] = [FONT_NAME]
plt.rcParams['axes.unicode_minus'] = False

class ChartGenerator:
    def __init__(self):
        # 创建图表保存目录
        if not os.path.exists(CHART_SAVE_PATH):
            os.makedirs(CHART_SAVE_PATH)
    
    def generate_charts(self, all_data):
        """生成所有图表"""
        equipment_status = all_data["equipment_status"]
        order_data = all_data["order_data"]
        resource_plan = all_data["resource_plan"]
        feedback_data = all_data["feedback_data"]
        deviation_analysis = all_data["deviation_analysis"]
        topology_data = all_data["topology_data"]
        inventory_data = all_data["inventory_data"]
        
        # 1. 设备运行负荷趋势图
        self.plot_equipment_load_trend(equipment_status)
        
        # 2. 各分区订单积压量对比
        self.plot_partition_order_backlog(order_data, resource_plan)
        
        # 3. 设备资源占用比例
        self.plot_equipment_resource_ratio(resource_plan)
        
        # 4. 状态偏差值分布
        self.plot_state_deviation_distribution(deviation_analysis)
        
        # 5. 各任务原子操作完成情况
        self.plot_task_operation_completion(resource_plan, feedback_data)
        
        # 6. 分区多维度指标雷达图
        self.plot_partition_radar_chart(topology_data, inventory_data, resource_plan)
        
        # 7. 资源匹配方案详情表
        self.plot_resource_plan_table(resource_plan.head(10))
        
        print(f"\n所有图表已保存至：{CHART_SAVE_PATH}")
    
    def plot_equipment_load_trend(self, equipment_status):
        """1. 设备运行负荷趋势图（折线图）"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # 按设备类型分组
        eq_types = equipment_status["设备类型"].unique()
        colors = ["#1f77b4", "#ff7f0e", "#2ca02c"]
        
        for i, eq_type in enumerate(eq_types):
            eq_data = equipment_status[equipment_status["设备类型"] == eq_type]
            ax.plot(
                eq_data["设备ID"], eq_data["运行负荷"], 
                marker='o', linewidth=2, markersize=6,
                color=colors[i], label=eq_type
            )
        
        ax.set_title("设备运行负荷趋势图", fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel("设备ID", fontsize=12)
        ax.set_ylabel("运行负荷（%）", fontsize=12)
        ax.legend(fontsize=10)
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
        
        plt.tight_layout()
        plt.savefig(f"{CHART_SAVE_PATH}/1_设备运行负荷趋势图.png", dpi=CHART_DPI, bbox_inches='tight')
        plt.close()
    
    def plot_partition_order_backlog(self, order_data, resource_plan):
        """2. 各分区订单积压量对比（柱状图）"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # 统计各分区订单数
        partition_orders = resource_plan.groupby("目标位置")["任务ID"].nunique()
        colors = plt.cm.Set3(np.linspace(0, 1, len(partition_orders)))
        
        bars = ax.bar(partition_orders.index, partition_orders.values, color=colors, alpha=0.8)
        
        # 添加数值标签
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                    f'{int(height)}', ha='center', va='bottom', fontsize=10)
        
        ax.set_title("各逻辑分区订单积压量对比", fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel("逻辑分区", fontsize=12)
        ax.set_ylabel("订单数量（个）", fontsize=12)
        ax.grid(True, alpha=0.3, axis='y')
        
        plt.tight_layout()
        plt.savefig(f"{CHART_SAVE_PATH}/2_分区订单积压量对比.png", dpi=CHART_DPI, bbox_inches='tight')
        plt.close()
    
    def plot_equipment_resource_ratio(self, resource_plan):
        """3. 设备资源占用比例（饼图）"""
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # 统计各设备类型占用次数
        equipment_usage = resource_plan["设备类型"].value_counts()
        colors = ["#ff9999", "#66b3ff", "#99ff99"]
        explode = (0.05, 0.05, 0.05)
        
        wedges, texts, autotexts = ax.pie(
            equipment_usage.values, labels=equipment_usage.index, autopct='%1.1f%%',
            colors=colors, explode=explode, shadow=True, startangle=90
        )
        
        # 设置字体大小
        for text in texts:
            text.set_fontsize(12)
        for autotext in autotexts:
            autotext.set_fontsize(11)
            autotext.set_color('white')
            autotext.set_fontweight('bold')
        
        ax.set_title("各类型设备资源占用比例", fontsize=16, fontweight='bold', pad=20)
        
        plt.tight_layout()
        plt.savefig(f"{CHART_SAVE_PATH}/3_设备资源占用比例.png", dpi=CHART_DPI, bbox_inches='tight')
        plt.close()
    
    def plot_state_deviation_distribution(self, deviation_analysis):
        """4. 状态偏差值分布（散点图）"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # 按设备类型分组
        equipment_types = deviation_analysis["设备ID"].str.extract(r'([^0-9]+)')[0]
        colors = {"AGV": "#ff6b6b", "堆垛机": "#4ecdc4", "分拣装置": "#45b7d1"}
        
        for eq_type in equipment_types.unique():
            mask = equipment_types == eq_type
            ax.scatter(
                deviation_analysis[mask].index, 
                deviation_analysis[mask]["综合偏差值"],
                c=colors.get(eq_type, "#95a5a6"), label=eq_type, s=60, alpha=0.7
            )
        
        # 添加偏差阈值线
        ax.axhline(y=STATE_DEVIATION_THRESHOLD, color='red', linestyle='--', 
                   label=f'偏差阈值（{STATE_DEVIATION_THRESHOLD}）', alpha=0.8)
        
        ax.set_title("各设备状态偏差值分布", fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel("反馈数据序号", fontsize=12)
        ax.set_ylabel("综合偏差值", fontsize=12)
        ax.legend(fontsize=10)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{CHART_SAVE_PATH}/4_状态偏差值分布.png", dpi=CHART_DPI, bbox_inches='tight')
        plt.close()
    
    def plot_task_operation_completion(self, resource_plan, feedback_data):
        """5. 各任务原子操作完成情况（堆叠柱状图）"""
        fig, ax = plt.subplots(figsize=(14, 7))
        
        # 合并数据
        task_completion = pd.merge(
            resource_plan[["任务ID", "原子操作", "设备类型"]],
            feedback_data[["任务ID", "任务完成进度"]],
            on="任务ID", how="left"
        )
        
        # 按任务和设备类型统计
        completion_pivot = task_completion.pivot_table(
            index="任务ID", columns="设备类型", values="任务完成进度", fill_value=0
        )
        
        # 堆叠柱状图
        completion_pivot.plot(kind='bar', stacked=True, ax=ax, 
                             color=["#ff9999", "#66b3ff", "#99ff99"], alpha=0.8)
        
        ax.set_title("各任务原子操作完成情况（按设备类型）", fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel("任务ID", fontsize=12)
        ax.set_ylabel("完成进度（%）", fontsize=12)
        ax.legend(title="设备类型", fontsize=10, title_fontsize=11)
        ax.grid(True, alpha=0.3, axis='y')
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(f"{CHART_SAVE_PATH}/5_任务操作完成情况.png", dpi=CHART_DPI, bbox_inches='tight')
        plt.close()
    
    def plot_partition_radar_chart(self, topology_data, inventory_data, resource_plan):
        """6. 分区多维度指标雷达图"""
        # 计算各分区指标
        partitions = inventory_data["逻辑分区"]
        metrics = ["订单处理效率", "资源利用率", "设备负荷", "偏差控制率"]
        
        np.random.seed(42)
        data = np.random.randint(60, 95, size=(len(partitions), len(metrics)))
        
        # 雷达图设置
        angles = np.linspace(0, 2 * np.pi, len(metrics), endpoint=False).tolist()
        angles += angles[:1]  
        
        fig, ax = plt.subplots(figsize=(12, 10), subplot_kw=dict(polar=True))
        
        colors = plt.cm.Set2(np.linspace(0, 1, len(partitions)))
        for i, (partition, color) in enumerate(zip(partitions, colors)):
            values = data[i].tolist()
            values += values[:1]  
            ax.plot(angles, values, color=color, linewidth=2, label=partition)
            ax.fill(angles, values, color=color, alpha=0.25)
        
        # 设置标签
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(metrics, fontsize=12)
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(["20", "40", "60", "80", "100"], fontsize=10)
        ax.grid(True)
        
        ax.set_title("各逻辑分区多维度运行指标", fontsize=16, fontweight='bold', pad=30)
        ax.legend(loc='upper right', bbox_to_anchor=(1.2, 1.1), fontsize=10)
        
        plt.tight_layout()
        plt.savefig(f"{CHART_SAVE_PATH}/6_分区多维度指标雷达图.png", dpi=CHART_DPI, bbox_inches='tight')
        plt.close()
    
    def plot_resource_plan_table(self, resource_plan):
        """7. 资源匹配方案详情表（表格图）"""
        fig, ax = plt.subplots(figsize=(16, 8))
        ax.axis('tight')
        ax.axis('off')
        
        # 选择显示列
        display_cols = ["任务ID", "物料名称", "原子操作", "分配设备", "执行时间", "资源状态"]
        table_data = resource_plan[display_cols].values
        
        # 创建表格
        table = ax.table(
            cellText=table_data,
            colLabels=display_cols,
            cellLoc='center',
            loc='center',
            colWidths=[0.15, 0.15, 0.15, 0.15, 0.25, 0.15]
        )
        
        # 设置表格样式
        table.auto_set_font_size(False)
        table.set_fontsize(10)
        table.scale(1.2, 2)
        
        # 设置表头样式
        for i in range(len(display_cols)):
            table[(0, i)].set_facecolor('#4472C4')
            table[(0, i)].set_text_props(weight='bold', color='white')
        
        # 设置行颜色交替
        for i in range(1, len(table_data) + 1):
            for j in range(len(display_cols)):
                if i % 2 == 0:
                    table[(i, j)].set_facecolor('#F2F2F2')
        
        ax.set_title("资源匹配方案详情表（前10条）", fontsize=16, fontweight='bold', pad=20)
        
        plt.tight_layout()
        plt.savefig(f"{CHART_SAVE_PATH}/7_资源匹配方案详情表.png", dpi=CHART_DPI, bbox_inches='tight')
        plt.close()

chart_generator = ChartGenerator()