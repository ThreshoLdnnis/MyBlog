const tagGroups = [
  ['核心身份', '数学本科生｜导师助理｜青年创业实践者｜科研实践者｜自主产品发起者｜研究团队负责人｜项目Mentor｜学生组织负责人'],
  ['教育与学术背景', '深圳北理莫斯科大学｜数学与应用数学｜清华大学深圳国际研究生院导师助理｜经济管理方向导师团队｜计算机产品研究方向｜清华大学X-lab核心成员'],
  ['职场经历', '香港Two Sigma量化研究实习｜阿里巴巴国际部HR实习｜金融研究实践｜招聘与人才评估实践'],
  ['团队角色', '团队Leader｜研究Mentor｜项目负责人｜跨学科团队PM｜产品负责人｜研究组织者｜方法指导者｜团队集成与交付推进者'],
  ['金融研究', '量化金融｜信用风险建模｜WOE／IV评分卡｜A股多因子研究｜动量因子｜价值因子｜质量因子｜动态因子配置｜市场状态研究｜机器学习选股｜可解释Alpha｜组合回测｜交易成本分析｜风险与绩效评价'],
  ['AI应用', 'AI辅助开发｜大模型应用｜智能体流程设计｜任务DAG｜上下文管理｜任务重规划｜Prompt设计｜金融NLP｜RAG｜混合检索｜来源引用｜LLM评测｜多AI工具协作'],
  ['研究方法', '数学建模｜统计分析｜数据清洗｜时点数据对齐｜特征工程｜因子中性化｜滚动样本外验证｜时间泄漏控制｜模型比较｜SHAP解释｜特征消融｜敏感性分析｜稳健性检验｜研究复现'],
  ['工程能力', 'Web应用开发实践｜前后端集成｜数据库应用｜权限设计｜响应式界面｜双语界面｜自动化测试｜部署与恢复｜代码审查｜技术文档｜GitHub协作'],
  ['编程与技术栈', 'Python｜C｜JavaScript｜TypeScript｜SQL｜React｜Next.js｜Tailwind CSS｜Three.js｜FastAPI｜SQLAlchemy｜Supabase｜PostgreSQL｜SQLite｜pandas｜DuckDB｜scikit-learn｜LightGBM｜SHAP｜Streamlit'],
  ['产品能力', '需求访谈｜用户场景分析｜产品定位｜PRD｜信息架构｜交互设计｜功能优先级｜产品原型｜MVP规划｜产品验证｜上线迭代｜运营后台设计'],
  ['创业与商业能力', '项目联合发起｜商业模式设计｜竞品研究｜市场需求分析｜技术可行性分析｜商业计划书｜路演表达｜跨专业资源协调'],
  ['跨学科方向', '金融科技｜教育与成长平台｜校园服务｜智能硬件｜智能美甲｜智能座舱｜可持续时尚｜循环经济｜情感科技｜数字纪念｜旅游供需平台｜跨境电商'],
  ['代表项目', '翎语Lingo｜TAP数字名片工作坊网站｜PACT银行智能体沙箱｜信贷风控评分卡与可解释机器学习｜A股多因子研究框架｜金融大模型研究助手｜动态多因子配置｜机器学习选股与可解释Alpha｜CookIdea｜Fastyle NailBot｜3D ReFab｜MetaCruise｜COOCLE｜LoveStone｜AI心语墙｜情绪调色盘｜AI Supply Mesh'],
  ['研究与课程实践', 'MathorCup方法重建与核验｜GRID光子事件数据分析｜线性回归房价预测｜公开数据建模｜模型解释与结果复核'],
  ['组织与社区', '数学建模协会会长｜AI创社杯项目部组委会委员｜深圳科创院校园大使｜通往AGI之路校园大使｜清华创客空间培养计划｜Fire Punch AI｜A NexSing｜ZPotentials｜奇绩创坛青年创业者社区｜XLink Labs'],
  ['荣誉与培养经历', '清华SDG创业大赛二等奖｜清华校长杯三等奖｜GMC国际管理大赛全国二等奖｜大学生新文科实践创新大赛二等奖｜腾讯Light计划获奖｜天格计划经历｜商汤OPC认证｜清华BID人才计划'],
  ['工作方式', '主动发起｜行动导向｜项目驱动学习｜跨领域学习｜结构化思考｜快速原型｜重视证据｜重视复现｜持续复盘｜团队协作｜成员培养｜工具协同'],
  ['个人兴趣与表达', '科技创作｜Vibe Coding｜Hackathon｜创业交流｜内容分享｜小红书创作｜网球｜羽毛球｜爬山｜摄影｜旅行｜美食｜宠物｜FPS游戏']
].map(([title, labels]) => ({title, labels: labels.split('｜')}));

export function mountAboutTags(board) {
  const filters = board.querySelector('.about-tag-filters');
  const content = board.querySelector('.about-tag-content');
  const status = board.querySelector('.about-tag-status');
  const buttons = new Map();
  const allGroups = '全部';

  function renderGroup({title, labels}) {
    const group = document.createElement('div');
    group.className = 'about-tag-group';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const list = document.createElement('ul');
    labels.forEach((label, index) => {
      const item = document.createElement('li');
      item.textContent = label;
      item.style.setProperty('--sticker-delay', `${Math.min(index, 8) * 24}ms`);
      list.append(item);
    });
    group.append(heading, list);
    return group;
  }

  function selectCategory(category) {
    if (buttons.get(category).getAttribute('aria-pressed') === 'true') return;
    for (const [title, button] of buttons) {
      button.setAttribute('aria-pressed', String(title === category));
    }
    const visibleGroups = category === allGroups ? tagGroups : tagGroups.filter(group => group.title === category);
    content.replaceChildren(...visibleGroups.map(renderGroup));
    status.textContent = `已显示${category}标签`;
  }

  for (const title of [allGroups, ...tagGroups.map(group => group.title)]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectCategory(title));
    buttons.set(title, button);
    filters.append(button);
  }

  selectCategory('核心身份');
}
