
# Generate requirements.txt based on imports in the project
```powershell
uv pip install pipreqs
pipreqs . --force --ignore .venv,__pycache__
uv pip install -r requirements.txt
# 物流仓储智能调度系统

# 基于 Flask + Bootstrap 5 的物流仓储智能调度系统可视化界面。

## 功能特性

- **调度总览**: 实时监控系统关键指标与设备状态。
- **任务管理**: 查看任务分解详情与资源匹配方案。
- **资源管理**: 监控 AGV、堆垛机等设备的运行负荷与状态。
- **数据分析**: 多维度图表展示系统运行数据。

## 快速开始

### 1. 安装依赖

确保已安装 Python 环境，然后运行：

```bash
pip install -r requirements.txt
```

### 2. 运行系统

运行 Flask 应用：

```bash
python app.py
```

> 注意：首次运行会自动执行一次完整的调度仿真以生成数据，可能需要几秒钟时间初始化。

### 3. 访问界面

浏览器打开：[http://127.0.0.1:5000](http://127.0.0.1:5000)

- **默认账号**: `admin`
- **默认密码**: `123456` (演示模式任意输入即可)

## 系统结构
- `app.py`: Web 应用主入口，启动时会自动运行仿真。
- `templates/`: 页面模板 (Bootstrap 5)。
- `charts/`: 生成的统计图表。
- `logs/`: 系统运行日志。


# 纯 bootstrap5
新建一个netlify_deploy项目

## 使用：
使用 Python 快速启动 HTTP 服务
您的环境中已经安装了 Python，可以使用 Python 自带的 HTTP 服务器模块：
打开终端（Terminal）。
进入 netlify_deploy 目录：
    cd netlify_deploy
启动 HTTP 服务器：
    python -m http.server 8000
在浏览器中访问：http://localhost:8000

## 部署指南 (Netlify)
您现在只需要将 netlify_deploy 文件夹部署到 Netlify 即可。
步骤:
登录 Netlify。
将您本地项目目录下的 netlify_deploy 文件夹直接拖拽到 Netlify 的 "Sites" 区域。
等待几秒钟，系统即刻上线。