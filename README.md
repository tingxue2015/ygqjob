# 央国企招聘平台 (YGQJob)

全国央国企校招/社招信息聚合平台，覆盖 900+ 央国企招聘信息。

## 项目结构

`
├── index.html              # 前端入口 (SPA)
├── css/style.css           # 样式
├── js/
│   ├── data.js             # 900+ 企业岗位数据
│   ├── data-service.js     # 数据服务层 (单例, 实时刷新)
│   ├── api.js              # API 客户端 (fetch + JWT)
│   ├── app.js              # 主应用逻辑 (渲染/路由/筛选/分页)
│   └── auth.js             # 认证模块 (API优先, 本地降级)
├── backend/
│   ├── server.js           # Express 入口
│   ├── package.json        # 依赖声明
│   ├── routes/auth.js      # 注册/登录 (JWT + bcrypt)
│   ├── routes/jobs.js      # 岗位搜索/过滤/分页
│   ├── middleware/         # validator, rateLimiter
│   └── data/               # 岗位数据 + 用户存储
└── README.md
`

## 两种运行方式

### 方式一：纯前端 (无需安装)

直接浏览器打开 index.html，所有数据本地加载，刷新/筛选全部可用。

### 方式二：完整后端 (推荐)

**要求**: Node.js 18+

`ash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 配置环境变量 (可选，已有默认值)
copy .env.example .env

# 4. 启动服务
npm start

# 5. 浏览器访问
# http://localhost:3000
`

## 功能模块

- **招聘岗位搜索**: 公司类型/招聘类型/对象/地点/截止时间 多维筛选 + 分页
- **进度看板**: 待处理→简历通过→笔试→面试→拟录用→已结束
- **内推广场**: 央国企员工内推码 + 专属渠道
- **资料包**: 行测真题/申论/面经 下载
- **公示墙**: 央国企录用公示信息
- **企业评价**: 匿名评价招聘流程
- **落户计算器**: 京沪深穗落户积分预估
- **登录/注册**: JWT 认证 + 本地存储降级

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 ({username, password, phone}) |
| POST | /api/auth/login | 登录 ({username, password}) |
| GET | /api/auth/me | 获取当前用户 |
| GET | /api/jobs | 岗位列表 (?q=&companyType=&page=&pageSize=) |
| GET | /api/jobs/:id | 岗位详情 |
| GET | /api/jobs/stats/summary | 统计摘要 |