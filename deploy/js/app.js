/**
 * 生产系统前端控制器
 * 负责界面渲染、硬件信号模拟与用户交互
 * 采用增量更新策略，避免界面闪烁
 */

const sys = {
    // 实例化核心模块
    warehouse: new ProductionCore.VirtualWarehouse(),
    dataGen: new ProductionCore.DataGenerator(),
    parser: new ProductionCore.TaskProcessor(),
    matcher: new ProductionCore.ResourceMatcher(),
    scheduler: new ProductionCore.AdaptiveScheduler(),
    corrector: new ProductionCore.StateCorrector(),
    
    state: {
        isRunning: false,
        resources: [],      // 设备列表
        activeTasks: [],    // 正在执行的原子操作 (Step级别)
        pendingOrders: [],  // 待处理订单
        completedTasks: [], // 已完成任务历史
        notifications: [],  // 系统通知
        monitoringTimer: null,
        charts: {},
        taskHistory: {      // 用于趋势图
            completed: Array(7).fill(0),
            labels: Array(7).fill('')
        },
        pagination: {
            currentPage: 1,
            itemsPerPage: 10
        }
    },

    init: function() {
        // 初始化资源状态
        this.state.resources = this.dataGen.generateEquipmentStatus();
        this.generateMockHistory(); // 生成历史数据
        this.initTaskHistory();
        this.bindEvents();
        this.startClock();
        this.renderResourceStaticLayout(); // 初始渲染静态结构
        this.initCharts();
        this.initAnalysisCharts(); // 初始化分析图表
        
        // 初始刷新一次Dashboard数据
        this.updateDashboardMetrics();
    },

    generateMockHistory: function() {
        // 1. 生成今日已完成任务 (模拟从早上8点到现在)
        const today = new Date();
        today.setHours(8, 0, 0, 0);
        const now = new Date();
        let currentTime = new Date(today);
        
        while(currentTime < now) {
            // 每30分钟左右生成一批任务
            if(Math.random() > 0.3) {
                const count = Math.floor(Math.random() * 3) + 1;
                for(let i=0; i<count; i++) {
                    const zones = ["A区", "B区", "C区", "D区", "E区"];
                    const task = {
                        "任务ID": "HIS-" + Math.floor(Math.random()*10000),
                        "原子操作": ["入库调度", "出库调度", "移库调动", "盘点调动"][Math.floor(Math.random()*4)],
                        "物料名称": ["电子元件", "机械零件", "包装材料"][Math.floor(Math.random()*3)],
                        "目标位置": zones[Math.floor(Math.random()*zones.length)],
                        "分配设备": "AGV" + (Math.floor(Math.random()*3)+1),
                        "状态": "Completed",
                        "进度": 100,
                        "优先级": "普通",
                        "创建时间": new Date(currentTime.getTime() - Math.random()*1800000).toLocaleString(),
                        "完成时间": currentTime.toLocaleString()
                    };
                    this.state.completedTasks.push(task);
                }
            }
            currentTime = new Date(currentTime.getTime() + 30*60000);
        }

        // 2. 生成数据分析图表所需的数据 (参考 image5)
        this.state.analysisData = {
            trend: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
                inbound: [120, 135, 145, 160, 155, 170, 165],
                outbound: [95, 110, 120, 130, 125, 140, 150],
                transfer: [45, 50, 60, 70, 65, 75, 80]
            },
            typeDist: [35, 45, 20, 15], // 入库, 出库, 移库, 盘点
            areaVolume: {
                labels: ['A区', 'B区', 'C区', 'D区', 'E区'],
                completed: [155, 142, 135, 128, 120],
                inProgress: [25, 18, 22, 15, 12]
            },
            deviceEff: {
                agv: [
                    {x: 65, y: 85}, {x: 70, y: 90}, {x: 75, y: 92}, {x: 80, y: 88}, {x: 85, y: 93}, {x: 90, y: 95}
                ],
                stacker: [
                    {x: 82, y: 85}, {x: 85, y: 88}, {x: 88, y: 92}, {x: 92, y: 90}
                ],
                sorter: [
                    {x: 88, y: 82}, {x: 92, y: 88}, {x: 95, y: 85}
                ]
            }
        };
    },

    initTaskHistory: function() {
        // 初始化最近7分钟/小时的标签
        const now = new Date();
        for(let i=0; i<7; i++) {
            const d = new Date(now.getTime() - (6-i)*60000);
            this.state.taskHistory.labels[i] = d.getHours() + ':' + (d.getMinutes()<10?'0':'') + d.getMinutes();
            this.state.taskHistory.completed[i] = Math.floor(Math.random() * 5); // 模拟初始数据
        }
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
            const newOrder = this.dataGen.generateOrder();
            this.state.pendingOrders.push(newOrder);
            this.addLog(`收到入库请求: ${newOrder["物料名称"]} -> ${newOrder["目标位置"]}`, "primary");
            
            // 立即解析任务为原子操作
            const steps = this.parser.process(newOrder);
            
            // 将第一步加入执行队列 (简化逻辑：串行执行)
            // 在实际系统中，这会是一个复杂的依赖图谱管理
            this.state.activeTasks.push({ 
                ...steps[0], 
                rawSteps: steps, // 保存完整步骤以便后续添加
                currentStepIndex: 0
            });
        }

        // 2. 资源调度与执行逻辑
        this.state.activeTasks.forEach(task => {
            if (task["状态"] === "Pending") {
                // 尝试匹配资源
                const assignedEqId = this.matcher.match(task, this.state.resources);
                
                if (assignedEqId !== "等待资源") {
                    task["分配设备"] = assignedEqId;
                    task["状态"] = "Executing";
                    
                    // 更新设备状态
                    const eq = this.state.resources.find(e => e["设备ID"] === assignedEqId);
                    if (eq) {
                        eq["运行状态"] = "忙碌";
                        eq["运行负荷"] += 10;
                    }
                    this.addLog(`任务 ${task["任务ID"]} [${task["原子操作"]}] 已下发至 ${assignedEqId}`, "info");
                }
            } else if (task["状态"] === "Executing") {
                // 模拟执行进度
                task["进度"] += Math.floor(Math.random() * 15) + 5;
                
                // 更新资源负载与状态校正
                const eq = this.state.resources.find(e => e["设备ID"] === task["分配设备"]);
                if (eq) {
                    // 模拟负载波动
                    eq["运行负荷"] = Math.min(100, Math.max(0, eq["运行负荷"] + (Math.random() - 0.3) * 5));
                    
                    // 状态校正
                    const correction = this.corrector.checkAndCalibrate(eq, { location: eq["当前位置"] }); // 简单传参
                    if (correction.required) {
                        this.addLog(correction.msg, "warning");
                    }
                }

                if (task["进度"] >= 100) {
                    task["进度"] = 100;
                    task["状态"] = "Completed";
                    
                    // 释放资源
                    if (eq) {
                        eq["运行状态"] = "正常运行";
                        // 假设任务完成，设备移动到了目标位置的一半概率
                        if(Math.random() > 0.5) eq["当前位置"] = task["目标位置"];
                    }

                    // 检查是否有后续步骤
                    if (task.currentStepIndex < task.rawSteps.length - 1) {
                        const nextIndex = task.currentStepIndex + 1;
                        const nextStep = task.rawSteps[nextIndex];
                        this.state.activeTasks.push({
                            ...nextStep,
                            rawSteps: task.rawSteps,
                            currentStepIndex: nextIndex
                        });
                    } else {
                        this.addLog(`订单 ${task["任务ID"]} 全部完成`, "success");
                        this.addNotification("调度任务完成", `订单 ${task["任务ID"]} 的仓储调度任务已完成`, "success");
                        
                        // 记录到历史数据
                        this.state.completedTasks.push(task);
                        // 更新趋势图数据
                        this.state.taskHistory.completed[6]++;
                    }
                }
            }
        });

        // 清理已完成的旧任务 (从 activeTasks 移出，但保留在 completedTasks)
        this.state.activeTasks = this.state.activeTasks.filter(t => t["状态"] !== "Completed");

        // 3. 界面增量更新 (关键：解决闪烁)
        this.updateDashboardMetrics();
        this.updateResourceCards();
        this.updateTaskTable();
        this.updateCharts();
        this.updateAnalysisCharts();

        // 随机生成系统通知
        if (Math.random() > 0.98) {
            const types = [
                { t: '设备异常报警', m: '3号堆垛机运行异常，请及时检查维护', type: 'warning' },
                { t: '库存预警', m: 'A区货架库存容量已达85%，建议及时调整', type: 'info' },
                { t: '系统更新', m: '智能调度算法已更新至v2.1，优化了路径规划', type: 'info' }
            ];
            const n = types[Math.floor(Math.random() * types.length)];
            this.addNotification(n.t, n.m, n.type);
        }
    },

    // ----------------------------------------------------
    // 模态框与交互逻辑
    // ----------------------------------------------------
    openNewOrderModal: function() {
        const modal = new bootstrap.Modal(document.getElementById('newOrderModal'));
        modal.show();
    },

    submitNewOrder: function() {
        const material = document.getElementById('order-material').value;
        const target = document.getElementById('order-target').value;
        const priority = document.getElementById('order-priority').value;
        
        const newOrder = {
            "订单号": "ORD-" + Date.now().toString().slice(-6),
            "物料名称": material,
            "目标位置": target,
            "优先级": priority,
            "创建时间": new Date().toLocaleTimeString()
        };
        
        this.state.pendingOrders.push(newOrder);
        this.addLog(`手动创建工单: ${material} -> ${target}`, "success");
        this.addNotification("工单创建成功", `工单 ${newOrder["订单号"]} 已进入待处理队列`, "success");
        
        // 关闭模态框
        const modalEl = document.getElementById('newOrderModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        this.updateDashboardMetrics();
    },

    openNewTaskModal: function() {
        // 重置表单
        document.getElementById('new-task-form').reset();
        document.getElementById('task-id-hidden').value = '';
        document.getElementById('newTaskModalLabel').innerText = '新增调度任务';
        
        const modal = new bootstrap.Modal(document.getElementById('newTaskModal'));
        modal.show();
    },

    openEditTaskModal: function(taskId) {
        const task = [...this.state.activeTasks, ...this.state.completedTasks].find(t => t["任务ID"] === taskId);
        if(!task) return;

        document.getElementById('task-id-hidden').value = task["任务ID"];
        document.getElementById('task-type').value = task["原子操作"];
        document.getElementById('task-area').value = task["目标位置"];
        document.getElementById('task-device').value = task["分配设备"] === "等待资源" ? "" : task["分配设备"];
        document.getElementById('task-priority').value = task["优先级"];
        
        document.getElementById('newTaskModalLabel').innerText = '编辑调度任务';
        
        const modal = new bootstrap.Modal(document.getElementById('newTaskModal'));
        modal.show();
    },

    submitNewTask: function() {
        const taskId = document.getElementById('task-id-hidden').value;
        const type = document.getElementById('task-type').value;
        const area = document.getElementById('task-area').value;
        const device = document.getElementById('task-device').value;
        const priority = document.getElementById('task-priority').value;
        const currentUser = "Admin"; // 模拟当前登录用户

        if (taskId) {
            // 编辑模式
            const task = this.state.activeTasks.find(t => t["任务ID"] === taskId) || this.state.completedTasks.find(t => t["任务ID"] === taskId);
            if (task) {
                task["原子操作"] = type;
                task["目标位置"] = area;
                task["分配设备"] = device || "等待资源";
                task["优先级"] = priority;
                task["负责人"] = currentUser;
                this.addLog(`任务 ${taskId} 已更新`, "info");
            }
        } else {
            // 新增模式
            const newTask = {
                "任务ID": "TSK-" + Date.now().toString().slice(-8),
                "原子操作": type,
                "物料名称": "手动调度任务",
                "目标位置": area,
                "分配设备": device || "等待资源",
                "状态": "Pending",
                "进度": 0,
                "优先级": priority,
                "负责人": currentUser,
                "创建时间": new Date().toLocaleString(),
                "rawSteps": [], 
                "currentStepIndex": 0
            };
            this.state.activeTasks.push(newTask);
            this.addLog(`手动创建任务: ${type} -> ${area}`, "primary");
        }
        
        const modalEl = document.getElementById('newTaskModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        this.updateTaskTable(); // 立即刷新列表
    },

    deleteTask: function(taskId) {
        document.getElementById('delete-task-id').value = taskId;
        const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        modal.show();
    },

    confirmDelete: function() {
        const taskId = document.getElementById('delete-task-id').value;
        if (taskId) {
            this.state.activeTasks = this.state.activeTasks.filter(t => t["任务ID"] !== taskId);
            this.state.completedTasks = this.state.completedTasks.filter(t => t["任务ID"] !== taskId);
            this.updateTaskTable();
            this.addLog(`任务 ${taskId} 已被手动删除`, "warning");
        }
        const modalEl = document.getElementById('deleteConfirmModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    },

    // ----------------------------------------------------
    // 界面更新 (无闪烁实现)
    // ----------------------------------------------------
    
    // 更新数字指标
    updateDashboardMetrics: function() {
        document.getElementById('dash-pending-orders').innerText = this.state.pendingOrders.length;
        document.getElementById('dash-active-tasks').innerText = this.state.activeTasks.length;
        
        const onlineCount = this.state.resources.filter(r => r["运行状态"] !== "故障").length;
        document.getElementById('dash-online-devices').innerText = onlineCount;
        
        // 调度效率 (优化算法：基准值 - 积压惩罚 - 故障惩罚 + 活跃奖励)
        // 基准 95%，每积压1个订单扣0.5%，每故障1台设备扣5%，每执行1个任务加0.2%
        let efficiency = 95;
        efficiency -= this.state.pendingOrders.length * 0.5;
        efficiency -= (this.state.resources.length - onlineCount) * 5;
        efficiency += this.state.activeTasks.length * 0.2;
        
        // 限制在 0-100 之间
        efficiency = Math.max(0, Math.min(100, efficiency));
        
        document.getElementById('dash-efficiency').innerText = efficiency.toFixed(1) + "%";

        // 今日任务统计
        const todayTotal = this.state.completedTasks.length + this.state.activeTasks.length;
        const todayCompleted = this.state.completedTasks.length;
        const rate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

        document.getElementById('stats-today-total').innerText = todayTotal;
        document.getElementById('stats-today-completed').innerText = todayCompleted;
        document.getElementById('stats-today-rate').innerText = rate + "%";
        document.getElementById('stats-progress-bar').style.width = rate + "%";
    },

    // 渲染资源卡片结构 (仅一次)
    renderResourceStaticLayout: function() {
        const container = document.getElementById('resources-container');
        container.innerHTML = '';
        this.state.resources.forEach(res => {
            const html = `
                <div class="col-md-4 mb-4" id="card-${res["设备ID"]}">
                    <div class="card h-100 border-top border-4 border-success shadow-sm">
                        <div class="card-body">
                            <span class="badge bg-secondary float-end status-badge">离线</span>
                            <h5 class="card-title fw-bold"><i class="fas fa-microchip me-2"></i>${res["设备ID"]}</h5>
                            <p class="text-muted small mb-3">${res["设备类型"]} 单元</p>
                            
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
                                <div class="col-6 text-end"><i class="fas fa-clock me-1"></i> <span class="runtime-text">-</span>h</div>
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
            const card = document.getElementById(`card-${res["设备ID"]}`);
            if (!card) return;

            // 更新状态徽章
            const badge = card.querySelector('.status-badge');
            if (res["运行状态"] === '忙碌') {
                badge.className = 'badge bg-primary float-end status-badge';
                badge.innerText = '作业中';
            } else if (res["运行状态"] === '故障' || res["运行状态"] === '轻微故障') {
                badge.className = 'badge bg-danger float-end status-badge';
                badge.innerText = '故障';
            } else {
                badge.className = 'badge bg-success float-end status-badge';
                badge.innerText = '就绪';
            }

            // 更新负载条
            const bar = card.querySelector('.progress-bar');
            const loadTxt = card.querySelector('.load-text');
            const loadVal = res["运行负荷"];
            bar.style.width = `${loadVal}%`;
            loadTxt.innerText = `${Math.round(loadVal)}%`;
            
            // 变色逻辑
            if (loadVal > 80) bar.className = 'progress-bar bg-danger';
            else if (loadVal > 50) bar.className = 'progress-bar bg-warning';
            else bar.className = 'progress-bar bg-success';

            // 更新位置和运行时间
            card.querySelector('.location-text').innerText = res["当前位置"];
            card.querySelector('.runtime-text').innerText = Math.round(res["累计运行时间"] / 60);
        });
    },

    // 增量更新任务列表
    updateTaskTable: function() {
        // 1. 更新 Dashboard 的简略表格 (只显示前5个)
        const tbodySimple = document.getElementById('tasks-table-body');
        if (tbodySimple) {
            const tasksToShow = this.state.activeTasks.slice(0, 5);
            if (tasksToShow.length === 0) {
                if (tbodySimple.innerHTML.indexOf('暂无数据') === -1) {
                    tbodySimple.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">暂无数据</td></tr>';
                }
            } else {
                // 简单表格逻辑保持不变，或者复用下面的逻辑
                // 这里为了简单，只做全量刷新（因为只有5行）
                tbodySimple.innerHTML = tasksToShow.map(task => `
                    <tr>
                        <td class="fw-bold small">${task["任务ID"]}</td>
                        <td><span class="badge bg-light text-dark border">${task["原子操作"]}</span></td>
                        <td>${task["分配设备"] || '-'}</td>
                        <td><span class="badge bg-${this.getStatusColor(task["状态"])}">${this.getStatusText(task["状态"])}</span></td>
                        <td>
                            <div class="progress" style="height: 5px; width: 80px;">
                                <div class="progress-bar bg-primary" style="width: ${task["进度"]}%"></div>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // 2. 更新 任务管理 的完整表格
        const tbodyFull = document.getElementById('full-tasks-table-body');
        if (tbodyFull) {
            // 合并进行中和已完成的任务
            const allTasks = [...this.state.activeTasks, ...this.state.completedTasks];
            // 按时间倒序
            allTasks.sort((a, b) => (b["创建时间"] || "").localeCompare(a["创建时间"] || ""));

            // 分页逻辑
            const totalItems = allTasks.length;
            const totalPages = Math.ceil(totalItems / this.state.pagination.itemsPerPage);
            
            if (this.state.pagination.currentPage > totalPages) this.state.pagination.currentPage = Math.max(1, totalPages);
            
            const start = (this.state.pagination.currentPage - 1) * this.state.pagination.itemsPerPage;
            const end = start + this.state.pagination.itemsPerPage;
            const tasksToShow = allTasks.slice(start, end);

            if (tasksToShow.length === 0) {
                tbodyFull.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-muted">暂无调度任务</td></tr>';
            } else {
                tbodyFull.innerHTML = tasksToShow.map(task => `
                    <tr>
                        <td class="fw-bold">${task["任务ID"]}</td>
                        <td>${task["原子操作"]}</td>
                        <td><span class="badge bg-${task["优先级"]==='高'?'danger':(task["优先级"]==='中'?'warning':'success')} bg-opacity-10 text-${task["优先级"]==='高'?'danger':(task["优先级"]==='中'?'warning':'success')}">${task["优先级"] || '中'}</span></td>
                        <td><span class="badge bg-${this.getStatusColor(task["状态"])}">${this.getStatusText(task["状态"])}</span></td>
                        <td>${task["目标位置"] || '-'}</td>
                        <td>${task["分配设备"] || '待分配'}</td>
                        <td>${task["负责人"] || '系统自动'}</td>
                        <td class="small text-muted">${task["创建时间"] || '-'}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="sys.openEditTaskModal('${task["任务ID"]}')"><i class="fas fa-edit"></i> 编辑</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="sys.deleteTask('${task["任务ID"]}')"><i class="fas fa-trash-alt"></i> 删除</button>
                        </td>
                    </tr>
                `).join('');
            }
            
            this.renderPagination(totalPages);
        }
    },

    renderPagination: function(totalPages) {
        const paginationEl = document.getElementById('task-pagination');
        if (!paginationEl) return;

        let html = '';
        const current = this.state.pagination.currentPage;

        // Prev
        html += `<li class="page-item ${current === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="sys.changePage(${current - 1})">上一页</a>
                 </li>`;

        // Pages
        for (let i = 1; i <= totalPages; i++) {
             html += `<li class="page-item ${current === i ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="sys.changePage(${i})">${i}</a>
                      </li>`;
        }

        // Next
        html += `<li class="page-item ${current === totalPages || totalPages === 0 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="sys.changePage(${current + 1})">下一页</a>
                 </li>`;
                 
        paginationEl.innerHTML = html;
    },

    changePage: function(page) {
        if (page < 1) return;
        this.state.pagination.currentPage = page;
        this.updateTaskTable();
    },

    getStatusColor: function(status) {
        if (status === 'Executing') return 'primary';
        if (status === 'Completed') return 'success';
        return 'secondary';
    },

    getStatusText: function(status) {
        if (status === 'Executing') return '进行中';
        if (status === 'Completed') return '已完成';
        return '待执行';
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
        // 实时负载图已移除，此处保留空函数以便扩展
    },

    updateCharts: function() {
        // 实时负载图已移除
    },

    // ----------------------------------------------------
    // 数据分析图表
    // ----------------------------------------------------
    initAnalysisCharts: function() {
        if(!this.state.analysisData) return;
        const data = this.state.analysisData;

        // 1. 任务完成趋势 (Line) - 多系列
        const ctxTrend = document.getElementById('chart-task-trend');
        if (ctxTrend) {
            this.state.charts.trend = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: data.trend.labels,
                    datasets: [
                        { 
                            label: '入库任务', 
                            data: data.trend.inbound, 
                            borderColor: '#3f51b5', // 深蓝
                            backgroundColor: 'rgba(63, 81, 181, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        { 
                            label: '出库任务', 
                            data: data.trend.outbound, 
                            borderColor: '#4caf50', // 绿色
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        { 
                            label: '移库任务', 
                            data: data.trend.transfer, 
                            borderColor: '#ff9800', // 橙色
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { y: { beginAtZero: true } },
                    plugins: { legend: { position: 'top' } }
                }
            });
        }

        // 2. 任务类型分布 (Pie)
        const ctxDist = document.getElementById('chart-task-dist');
        if (ctxDist) {
            this.state.charts.dist = new Chart(ctxDist, {
                type: 'pie',
                data: {
                    labels: ['入库调度', '出库调度', '移库调动', '盘点调动'],
                    datasets: [{
                        data: data.typeDist,
                        backgroundColor: ['#3f51b5', '#4caf50', '#ff9800', '#9c27b0'],
                        borderWidth: 1,
                        borderColor: '#fff'
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }

        // 3. 各区域任务量 (Bar) - 分组柱状图
        const ctxArea = document.getElementById('chart-area-volume');
        if (ctxArea) {
            this.state.charts.area = new Chart(ctxArea, {
                type: 'bar',
                data: {
                    labels: data.areaVolume.labels,
                    datasets: [
                        {
                            label: '已完成',
                            data: data.areaVolume.completed,
                            backgroundColor: '#5c6bc0',
                            borderRadius: 2
                        },
                        {
                            label: '进行中',
                            data: data.areaVolume.inProgress,
                            backgroundColor: '#ffb74d',
                            borderRadius: 2
                        }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // 4. 设备效率分析 (Scatter)
        const ctxEff = document.getElementById('chart-device-efficiency');
        if (ctxEff) {
            this.state.charts.eff = new Chart(ctxEff, {
                type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: 'AGV小车',
                            data: data.deviceEff.agv,
                            backgroundColor: '#3f51b5',
                            pointRadius: 6
                        },
                        {
                            label: '堆垛机',
                            data: data.deviceEff.stacker,
                            backgroundColor: '#4caf50',
                            pointRadius: 6
                        },
                        {
                            label: '分拣装置',
                            data: data.deviceEff.sorter,
                            backgroundColor: '#ff9800',
                            pointRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { 
                            title: { display: true, text: '设备负载率 (%)' }, 
                            min: 60, 
                            max: 100 
                        },
                        y: { 
                            title: { display: true, text: '调度效率 (%)' }, 
                            min: 80, 
                            max: 100 
                        }
                    }
                }
            });
        }
    },

    updateAnalysisCharts: function() {
        // 静态展示，无需实时刷新
    },

    updateAnalysisTimeRange: function(range, btn) {
        // 1. 更新按钮状态
        const container = document.getElementById('analysis-time-controls');
        Array.from(container.children).forEach(c => c.classList.remove('active'));
        btn.classList.add('active');

        // 2. 生成新数据
        let newData = {};
        if (range === 'week') {
            newData = {
                trend: {
                    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                    inbound: [20, 25, 22, 30, 28, 15, 10],
                    outbound: [18, 22, 20, 25, 24, 12, 8],
                    transfer: [8, 10, 12, 15, 10, 5, 5]
                },
                typeDist: [30, 40, 20, 10],
                areaVolume: {
                    labels: ['A区', 'B区', 'C区', 'D区', 'E区'],
                    completed: [45, 38, 35, 30, 25],
                    inProgress: [5, 4, 6, 3, 2]
                }
            };
        } else if (range === 'month') {
            newData = {
                trend: {
                    labels: ['第一周', '第二周', '第三周', '第四周'],
                    inbound: [120, 135, 110, 140],
                    outbound: [100, 115, 95, 120],
                    transfer: [40, 50, 35, 45]
                },
                typeDist: [32, 42, 18, 8],
                areaVolume: {
                    labels: ['A区', 'B区', 'C区', 'D区', 'E区'],
                    completed: [180, 160, 150, 140, 130],
                    inProgress: [15, 12, 18, 10, 8]
                }
            };
        } else {
            // Year (Default)
            newData = {
                trend: {
                    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
                    inbound: [120, 135, 145, 160, 155, 170, 165],
                    outbound: [95, 110, 120, 130, 125, 140, 150],
                    transfer: [45, 50, 60, 70, 65, 75, 80]
                },
                typeDist: [35, 45, 20, 15],
                areaVolume: {
                    labels: ['A区', 'B区', 'C区', 'D区', 'E区'],
                    completed: [155, 142, 135, 128, 120],
                    inProgress: [25, 18, 22, 15, 12]
                }
            };
        }

        // 3. 更新图表
        if (this.state.charts.trend) {
            this.state.charts.trend.data.labels = newData.trend.labels;
            this.state.charts.trend.data.datasets[0].data = newData.trend.inbound;
            this.state.charts.trend.data.datasets[1].data = newData.trend.outbound;
            this.state.charts.trend.data.datasets[2].data = newData.trend.transfer;
            this.state.charts.trend.update();
        }

        if (this.state.charts.dist) {
            this.state.charts.dist.data.datasets[0].data = newData.typeDist;
            this.state.charts.dist.update();
        }

        if (this.state.charts.area) {
            this.state.charts.area.data.datasets[0].data = newData.areaVolume.completed;
            this.state.charts.area.data.datasets[1].data = newData.areaVolume.inProgress;
            this.state.charts.area.update();
        }
        
        // 模拟加载提示
        this.addLog(`切换数据视图: ${btn.innerText}`, "info");
    },


    // ----------------------------------------------------
    // 系统通知
    // ----------------------------------------------------
    addNotification: function(title, message, type = 'info') {
        const notif = { id: Date.now(), title, message, type, time: new Date().toLocaleTimeString() };
        this.state.notifications.unshift(notif);
        
        // 更新 Badge
        const badge = document.getElementById('notification-badge');
        badge.innerText = this.state.notifications.length;
        badge.style.display = 'block';

        // 更新列表
        const list = document.getElementById('notification-list');
        const iconMap = {
            'success': 'fa-check-circle text-success',
            'warning': 'fa-exclamation-triangle text-warning',
            'danger': 'fa-times-circle text-danger',
            'info': 'fa-info-circle text-primary'
        };
        
        const item = document.createElement('div');
        item.className = 'px-3 py-2 border-bottom bg-white';
        item.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="fas ${iconMap[type]} mt-1 me-2"></i>
                <div>
                    <div class="small fw-bold text-dark">${title}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${message}</div>
                    <div class="text-muted" style="font-size: 0.7rem;">${notif.time}</div>
                </div>
            </div>
        `;
        
        if (list.children[0]?.classList.contains('text-center')) {
            list.innerHTML = '';
        }
        list.prepend(item);
    },

    clearNotifications: function() {
        this.state.notifications = [];
        document.getElementById('notification-badge').style.display = 'none';
        document.getElementById('notification-list').innerHTML = '<div class="text-center py-4 text-muted small">暂无新通知</div>';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    sys.init();
});
