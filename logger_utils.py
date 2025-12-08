import logging
import os
from tqdm import tqdm
from datetime import datetime

class ProgressLogger:
    def __init__(self, total_steps):
        # 初始化日志
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - %(module)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        file_handler = logging.FileHandler(
            f"{log_dir}/scheduling_{datetime.now().strftime('%Y%m%d%H%M%S')}.log",
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # 初始化进度条和累计步数
        self.total_steps = total_steps  
        self.progress_bar = tqdm(total=total_steps, desc="系统运行进度", unit="%", ncols=100)
        self.current_progress = 0
        self.accumulated_steps = 0 
    
    def update_progress(self, step, message):
        """更新进度条并打印日志"""
        remaining_steps = self.total_steps - self.accumulated_steps
        actual_step = min(step, remaining_steps)
        
        self.accumulated_steps += actual_step
        self.current_progress = (self.accumulated_steps / self.total_steps) * 100
        
        if actual_step > 0:
            self.progress_bar.update(actual_step)
        
        self.logger.info(f"{message}，当前进度：{min(self.current_progress, 100.0):.1f}%")
    
    def close(self):
        self.progress_bar.close()
        self.logger.info("系统运行完成，日志已保存")