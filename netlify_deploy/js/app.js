/**
 * 生产系统前端控制器
 * 负责界面渲染、硬件信号模拟与用户交互
 * 采用增量更新策略，避免界面闪烁
 */

const sys = {
    // 实例化核心模块
    signalGen: new ProductionCore.SignalGenerator(),
    parser: new ProductionCore.TaskParser(),
    matcher: new ProductionCore.ResourceMatcher(),
    corrector: new ProductionCore.StateCorrector(),
    
    state: {
        isRunning: false,
        resources: [],
        activeTasks: [], // 正在执行的原子操作
        pendingOrders: [],
        monitoringTimer: null,
        charts: {}
    },

    init: function() {
        this.state.resources = this.signalGen.initHardwareStatus();
        this.bindEvents();
        this.startClock();
        this.renderResourceStaticLayout(); // 初始渲染静态结构
        this.initCharts();
    },

    bindEvents: function() {
        // 导航切换
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if(e.currentTarget.getAttribute('onclick')) return;
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const target = e.currentTarget.getAttribute('data-target');
                document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
                document.getElementById(target).classList.remove('d-none');
            });
        });

        // 登录逻辑
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            document.getElementById('login-section').classList.add('d-none');
            document.getElementById('main-interface').classList.remove('d-none');
            // 自动连接
            this.toggleSystemConnection();
        });
    },

    startClock: function() {
        setInterval(() => {
            document.getElementById('current-time').innerText = new Date().toLocaleString('zh-CN', { hour12: false });
        }, 1000);
    },

    // ----------------------------------------------------
    // 系统控制 (生产模式)
    // ----------------------------------------------------
    toggleSystemConnection: function() {
        const btn = document.getElementById('btn-system-toggle');
        const statusBadge = document.getElementById('system-status-badge');

        if (this.state.isRunning) {
            // 断开连接
            this.state.isRunning = false;
            clearInterval(this.state.monitoringTimer);
            btn.innerHTML = '<i class="fas fa-plug me-1"></i> 连接生产系统';
            btn.classList.replace('btn-danger', 'btn-success');
            statusBadge.className = 'badge bg-secondary me-3';
            statusBadge.innerText = '离线模式';
            this.addLog("已断开与 WCS 系统的连接", "warning");
        } else {
            // 建立连接
            this.state.isRunning = true;
            btn.innerHTML = '<i class="fas fa-power-off me-1"></i> 断开连接';
            btn.classList.replace('btn-success', 'btn-danger');
            statusBadge.className = 'badge bg-success me-3';
            statusBadge.innerText = '在线监控中';
            this.addLog("成功接入生产系统信号流", "success");
            
            // 启动实时监控循环 (每 1.5秒刷新一次状态)
            this.state.monitoringTimer = setInterval(() => this.productionLoop(), 1500);
        }
    },

    // 生产主循环：模拟 PLC/WCS 信号处理
    productionLoop: function() {
        // 1. 模拟接收外部订单信号 (30% 概率)
        if (Math.random() > 0.7) {
            const newOrder = this.signalGen.generateInputSignal();
            this.state.pendingOrders.push(newOrder);
            this.addLog(`收到入库请求: ${newOrder.material}`, "primary");
            
            // 立即解析任务
            const steps = this.parser.decompose(newOrder);
            // 将第一个步骤加入执行队列
            this.state.activeTasks.push({ ...steps[0], stepIndex: 0, totalSteps: steps.length, rawSteps: steps });
        }

        // 2. 资源调度与执行逻辑
        this.state.activeTasks.forEach(task => {
            if (task.status === "Pending") {
                // 尝试匹配资源
                const resource = this.matcher.match(task, this.state.resources);
                if (resource) {
                    resource.status = "Working";
                    resource.load = 20; // 初始负载
                    task.status = "Executing";
                    task.assignedTo = resource.id;
                    this.addLog(`任务 ${task.id} 已下发至 ${resource.id}`, "info");
                }
            } else if (task.status === "Executing") {
                // 模拟执行进度
                task.progress += Math.floor(Math.random() * 15) + 5;
                
                // 更新资源负载
                const res = this.state.resources.find(r => r.id === task.assignedTo);
                if (res) {
                    res.load = Math.min(100, res.load + Math.random() * 5);
                    // 状态校正检查
                    const correction = this.corrector.check(res);
                    if (correction.calibrated) {
                        this.addLog(correction.msg, "warning");
                    }
                }

                if (task.progress >= 100) {
                    task.progress = 100;
                    task.status = "Completed";
                    
                    // 释放资源
                    if (res) {
                        res.status = "Idle";
                        res.load = 0;
                        res.location = task.desc.includes("站台") ? "Station" : "Shelf";
                    }

                    // 检查是否还有后续步骤
                    if (task.stepIndex < task.totalSteps - 1) {
                        const nextStep = task.rawSteps[task.stepIndex + 1];
                        this.state.activeTasks.push({ 
                            ...nextStep, 
                            stepIndex: task.stepIndex + 1, 
                            totalSteps: task.totalSteps, 
                            rawSteps: task.rawSteps 
                        });
                    }
                }
            }
        });

        // 清理已完成的旧任务 (保留最近20条)
        this.state.activeTasks = this.state.activeTasks.filter(t => t.status !== "Completed" || Math.random() > 0.1);

        // 3. 界面增量更新 (关键：解决闪烁)
        this.updateDashboardMetrics();
        this.updateResourceCards();
        this.updateTaskTable();
        this.updateCharts();
    },

    // ----------------------------------------------------
    // 界面更新 (无闪烁实现)
    // ----------------------------------------------------
    
    // 更新数字指标
    updateDashboardMetrics: function() {
        this.updateText('dash-pending-orders', this.state.pendingOrders.length);
        this.updateText('dash-active-tasks', this.state.activeTasks.filter(t => t.status === 'Executing').length);
        this.updateText('dash-online-devices', this.state.resources.filter(r => r.isOnline).length);
        
        // 计算平均负载
        const avgLoad = this.state.resources.reduce((sum, r) => sum + r.load, 0) / this.state.resources.length;
        this.updateText('dash-avg-load', Math.round(avgLoad) + '%');
    },

    // 渲染资源卡片结构 (仅一次)
    renderResourceStaticLayout: function() {
        const container = document.getElementById('resources-container');
        container.innerHTML = '';
        this.state.resources.forEach(res => {
            const html = `
                <div class="col-md-4 mb-4" id="card-${res.id}">
                    <div class="card h-100 border-top border-4 border-success shadow-sm">
                        <div class="card-body">
                            <span class="badge bg-secondary float-end status-badge">离线</span>
                            <h5 class="card-title fw-bold"><i class="fas fa-microchip me-2"></i>${res.id}</h5>
                            <p class="text-muted small mb-3">${res.type} 单元</p>
                            
                            <div class="mb-3">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span>实时负载</span>
                                    <span class="fw-bold load-text">0%</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-success" role="progressbar" style="width: 0%"></div>
                                </div>
                            </div>
                            <div class="row g-0 small text-muted">
                                <div class="col-6"><i class="fas fa-map-marker-alt me-1"></i> <span class="location-text">-</span></div>
                                <div class="col-6 text-end"><i class="fas fa-bolt me-1"></i> <span class="battery-text">-</span>%</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    },

    // 增量更新资源状态
    updateResourceCards: function() {
        this.state.resources.forEach(res => {
            const card = document.getElementById(`card-${res.id}`);
            if (!card) return;

            // 更新状态徽章
            const badge = card.querySelector('.status-badge');
            if (res.status === 'Working') {
                badge.className = 'badge bg-primary float-end status-badge';
                badge.innerText = '作业中';
            } else {
                badge.className = 'badge bg-success float-end status-badge';
                badge.innerText = '就绪';
            }

            // 更新负载条
            const bar = card.querySelector('.progress-bar');
            const loadTxt = card.querySelector('.load-text');
            bar.style.width = `${res.load}%`;
            loadTxt.innerText = `${Math.round(res.load)}%`;
            
            // 变色逻辑
            if (res.load > 80) bar.className = 'progress-bar bg-danger';
            else if (res.load > 50) bar.className = 'progress-bar bg-warning';
            else bar.className = 'progress-bar bg-success';

            // 更新位置和电量
            card.querySelector('.location-text').innerText = res.location;
            card.querySelector('.battery-text').innerText = res.battery;
        });
    },

    // 增量更新任务列表
    updateTaskTable: function() {
        const tbody = document.getElementById('tasks-table-body');
        const tasksToShow = this.state.activeTasks.slice().reverse().slice(0, 8); // 显示最新的8条

        if (tasksToShow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">当前无活动任务</td></tr>';
            return;
        }

        // 清除"无任务"提示
        if (tbody.children.length === 1 && tbody.children[0].innerText.includes('无活动任务')) {
            tbody.innerHTML = '';
        }

        tasksToShow.forEach(task => {
            let row = document.getElementById(`row-${task.id}`);
            
            // 如果行不存在，创建新行
            if (!row) {
                const tr = document.createElement('tr');
                tr.id = `row-${task.id}`;
                tr.className = 'fade-in';
                tr.innerHTML = `
                    <td class="fw-bold small">${task.id}</td>
                    <td>${task.desc}</td>
                    <td class="res-cell">-</td>
                    <td><span class="badge bg-secondary status-cell">Pending</span></td>
                    <td>
                        <div class="progress" style="height: 5px; width: 80px;">
                            <div class="progress-bar bg-primary" style="width: 0%"></div>
                        </div>
                    </td>
                `;
                tbody.prepend(tr);
                row = tr;
            }

            // 更新行内容
            row.querySelector('.res-cell').innerText = task.assignedTo || '待分配';
            const statusBadge = row.querySelector('.status-cell');
            const progressBar = row.querySelector('.progress-bar');

            if (task.status === 'Executing') {
                statusBadge.className = 'badge bg-primary status-cell';
                statusBadge.innerText = '执行中';
            } else if (task.status === 'Completed') {
                statusBadge.className = 'badge bg-success status-cell';
                statusBadge.innerText = '已完成';
            }

            progressBar.style.width = `${task.progress}%`;
        });

        // 清理界面上多余的旧行
        while (tbody.children.length > 10) {
            tbody.lastChild.remove();
        }
    },

    // 工具：仅在内容变化时更新文本
    updateText: function(id, text) {
        const el = document.getElementById(id);
        if (el && el.innerText != text) el.innerText = text;
    },

    addLog: function(msg, type='info') {
        const box = document.getElementById('system-logs');
        const line = document.createElement('div');
        const time = new Date().toLocaleTimeString('zh-CN', {hour12:false});
        line.className = 'log-line small mb-1 border-bottom pb-1';
        line.innerHTML = `<span class="text-muted me-2">[${time}]</span> <span class="text-${type}">${msg}</span>`;
        box.prepend(line);
        if (box.children.length > 15) box.lastChild.remove();
    },

    // ----------------------------------------------------
    // 图表 (Chart.js)
    // ----------------------------------------------------
    initCharts: function() {
        Chart.defaults.animation = false; // 关闭图表动画以提高实时性能

        // 实时负载图
        const ctxLoad = document.getElementById('chart-realtime-load');
        if (ctxLoad) {
            this.state.charts.load = new Chart(ctxLoad, {
                type: 'line',
                data: {
                    labels: Array(20).fill(''),
                    datasets: [{
                        label: '系统综合负载 %',
                        data: Array(20).fill(0),
                        borderColor: '#0d6efd',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        tension: 0.3,
                        fill: true,
                        backgroundColor: 'rgba(13, 110, 253, 0.05)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { min: 0, max: 100, grid: { display: true } }, x: { grid: { display: false } } },
                    animation: { duration: 0 } // 关键：禁用动画防止闪烁
                }
            });
        }
    },

    updateCharts: function() {
        if (this.state.charts.load) {
            const chart = this.state.charts.load;
            const avgLoad = this.state.resources.reduce((sum, r) => sum + r.load, 0) / this.state.resources.length;
            
            // 滑动窗口更新
            chart.data.datasets[0].data.shift();
            chart.data.datasets[0].data.push(avgLoad);
            chart.update(); // 无参数更新，配合全局 animation: false
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    sys.init();
});
