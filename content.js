export const initialContent = {
  profile: {
    name: 'Mofarigano', chineseName: '朱飞阳', alias: '老猪 / Timofey',
    intro: '你好鸭！我叫朱飞阳英语名Mofarigano，深圳北理莫斯科大学数学与应用数学专业本科生，清华大学深圳国际研究生院经济管理学院的导师助理，研究计算机领域的产品方向；清华大学 X-lab 核心成员、清华翎语发起人，兼具量化金融、人工智能应用、产品开发与跨学科团队管理经历的青年创业及科研实践者。',
    bio: [
      '任校数学建模协会会长、AI创社杯项目部组委会委员、深圳科创院校园大使，曾参与清华大学创客空间培养计划，并参与 Fire Punch AI、A NexSing、ZPotentials、奇绩创坛青年创业者社区、XLink Labs 等科技与创业社区。',
      '拥有香港 Two Sigma 量化研究及阿里巴巴国际部 HR 实习经历，在信贷风险建模、A股多因子研究、金融大模型研究助手、动态多因子配置、机器学习选股与可解释Alpha研究五项项目中担任团队 Leader 与 Mentor，负责研究方向规划、团队组织、方法指导与成果交付推进。',
      '自主设计并上线翎语大学生成长平台及 TAP 数字名片工作坊网站，同时具有智能美甲设备、智能座舱、可持续时尚与情感科技等跨学科项目的联合发起、团队管理及产品方案设计经历。长期关注人工智能、金融科技与创新产品的结合，积累了从需求研究、商业分析、研究方案设计到原型开发、工程协作和验证交付的实践经验，能够将数学分析、产品思考与团队执行结合起来，把创意拆解为可开展的研究、可体验的原型和可核验的成果，并通过项目指导帮助团队成员共同成长。'
    ].join('\n\n'),
    github: 'https://github.com/ThreshoLdnnis'
  },
  timeline: [
    {id:'work-2025',date:'2025—2026',category:'工作',title:'把数学带进真实市场',subtitle:'Two Sigma · 香港 · 量化研究实习',body:'从研究问题到数据、模型与检验，关注可解释性和可复现的研究过程。'},
    {id:'work-2024',date:'2024',category:'工作',title:'第一次走进大公司的日常',subtitle:'阿里巴巴国际 · 深圳 · HR 实习',body:'在组织与人的交汇处，接触真实业务中的协作。'},
    {id:'study-now',date:'持续进行',category:'学习',title:'用数学理解世界',subtitle:'数学与应用数学 · 本科学习',body:'量化金融、金融 AI 与数学建模；带领研究团队，也在解释问题的过程中继续学习。'},
    {id:'build-now',date:'持续进行',category:'创业',title:'让想法拥有形状',subtitle:'Lingyu / TAP / CookIdea',body:'独立设计开发成长平台与数字名片工作坊，发起 CookIdea，探索创意如何变成产品。'},
    {id:'life-now',date:'日常',category:'生活',title:'也给生活，留一点空白',subtitle:'旅行 · 徒步 · 摄影 · 网球 · 羽毛球',body:'从书架、音乐和走过的地方开始，把属于自己的生活慢慢收集起来。'}
  ],
  honors: [],
  collections: [
    {id:'c1',category:'工具',title:'GitHub',subtitle:'把想法，做成可以分享的东西。',url:'https://github.com/ThreshoLdnnis',body:'我的公开作品与代码，从产品到视觉实验。',image:'',featured:true},
    {id:'c2',category:'地点',title:'莫斯科',subtitle:'红场与城市记忆',url:'',body:'来自「猪的世界足迹」的已有收藏。打开旅行地图，继续探索这座城市。',image:'assets/travel-preview.png',module:'map'},
    {id:'c3',category:'物品',title:'一本值得反复翻开的书',subtitle:'猪的读书角 · 51 本',url:'',body:'文学、心理、成长、投资与科学。把书从立体书架抽出来，慢慢读。',image:'assets/books-preview.jpg',module:'books'},
    {id:'c4',category:'语录',title:'保持好奇，缓慢生长。',subtitle:'写给这个持续更新的小站',url:'',body:'这里不急着给自己下定义。研究、创造，也允许偶尔停下来。',image:''},
    {id:'c5',category:'说说',title:'生活，正在收藏中。',subtitle:'站点开场白',url:'',body:'一个地方存放作品，另一个角落存放喜欢。现在，它们有了同一个家。',image:''},
    {id:'c6',category:'音乐',title:'鲜花',subtitle:'回春丹 · 来自我的音乐墙',url:'',body:'一张封面，一段反复回来的旋律。',image:'assets/music-preview.jpg',module:'music'}
  ],
  posts: [
    {id:'p1',category:'站点手记',date:'2026.11.17',title:'给生活，留一个自己的地方。',excerpt:'把散落的作品、音乐、书和远方，装进同一本持续更新的手册。',body:'这个网站的起点，是把喜欢的东西放在一起。\n\n从 Fashion Web 的排版实验，到一张可以探索的旅行地图，再到可以翻动的唱片与书架，它们曾经是各自独立的小空间。现在，这些片段在这里相遇。\n\n这里会留下完成的作品，也会容纳尚未成形的想法。时间轴记录学习与工作，收藏夹留给日常的心动。\n\n不用一次写完。生活仍在进行，这本手册也会继续生长。'},
    {id:'p2',category:'设计手记',date:'2026.11.17',title:'把数字空间，做得有一点触感。',excerpt:'纸张、唱片、书脊与收藏柜，是这次设计的四个关键词。',body:'这次设计从现有页面里提炼了几种共同的语言：足够大的字、细而克制的线、温暖的纸张底色，以及能够拿起、翻看、旋转的物件。\n\n旅行地图、音乐墙与读书角保留原来的交互，各自成为一个可以进入的房间。主页面负责引路，而每个房间都有自己的节奏。\n\n手办柜则把图像放进带有纵深的陈列空间，让收藏有一个安静的舞台。'}
  ]
};

export const journalIllustrations = [
  {id:'illustration-01', title:'亮着灯的窗', image:'assets/journal-book/page-01.webp', alt:'星空下亮着不同颜色灯光的窗户，旁边写着发生在各户人家里的故事。'},
  {id:'illustration-02', title:'星空下的草地', image:'assets/journal-book/page-02.webp', alt:'草地上的人们在星穹下各有所思，星星旁写着他们经历的事。'},
  {id:'illustration-03', title:'另一生的蝴蝶', image:'assets/journal-book/page-03.webp', alt:'两只白色蝴蝶在草丛间，图中文字：Maybe in another life? Yeah.'},
  {id:'illustration-04', title:'月下的黑猫与乌鸦', image:'assets/journal-book/page-04.webp', alt:'月下的黑猫与乌鸦在树枝上对话：are we cursed? only in their stories'},
  {id:'illustration-05', title:'深夜里的灯火', image:'assets/journal-book/page-05.webp', alt:'星幕下的街区，窗口的亮光旁写着一个个夜里的片段。'},
  {id:'illustration-06', title:'生活也可以重启', image:'assets/journal-book/page-06.webp', alt:'蓝色夜空下，一个人与一只猫在屋顶。图中文字：Just kidding… You’re going to get through this.'},
  {id:'illustration-07', title:'水面上与水面下', image:'assets/journal-book/page-07.webp', alt:'水下的鱼问花上的鸟看到了什么。鸟说：a world that’s empty without you'},
  {id:'illustration-08', title:'望月时想起你', image:'assets/journal-book/page-08.webp', alt:'心形的月亮照在海面上。图中文字：When I look at the moon, i still think of you'},
];

export const projects = [
  {id:'music',title:'音乐光盘',type:'视觉交互',year:'2026',number:'01',image:'assets/music-preview.jpg',description:'让封面有形状，让旋律有归处。Three.js 立体唱片与歌词手记。',preview:'music',tag:'INTERACTIVE / MUSIC'},
  {id:'books',title:'猪的读书角',type:'视觉交互',year:'2026',number:'02',image:'assets/books-preview.jpg',description:'51 本书，51 个可以走进去的世界。可抽取、可翻阅的立体书架。',preview:'books',tag:'3D / READING'},
  {id:'orbit',title:'照片球',type:'视觉交互',year:'2026',number:'03',image:'assets/projects/orbit.jpg',description:'将影像环绕成一颗可以触及的星球，用拖动与镜头推进探索空间。',preview:'orbit',tag:'EXPERIMENT / SPACE'},
  {id:'ronin',title:'浪人X',type:'视觉交互',year:'2026',number:'04',image:'assets/projects/roninx.jpg',description:'机械、留白与聚光。藏在光线后面的另一种面貌。',preview:'ronin',tag:'EXPERIMENT / MOTION'},
  {id:'spider',title:'成为蛛蛛',type:'视觉交互',year:'2026',number:'05',image:'assets/projects/spider.webp',description:'让跳蛛追着光标探路，织起蛛丝，在三种织物主题里翻看收藏。',preview:'spider',tag:'INTERACTIVE / PLAY'},
  {id:'rider',title:'铠甲变身',type:'视觉交互',year:'2026',number:'06',image:'assets/projects/rider.webp',description:'滑过人物轮廓，以撕裂光效从半身像切换到骑手铠甲。',preview:'rider',tag:'INTERACTIVE / REVEAL'},
  {id:'page-to-code',title:'万物溯源',type:'视觉交互',year:'2026',number:'07',image:'assets/projects/page-to-code.webp',description:'双向拖动传送带，看迷你网页穿过扫描线，在画面与 HTML 之间转换。',preview:'page-to-code',tag:'INTERACTIVE / CODE'},
  {id:'zfy01',title:'机械Y',type:'视觉交互',year:'2026',number:'08',image:'assets/projects/zfy01.webp',description:'在冷灰色机甲之间移动光斑，揭开另一层机械造型。',preview:'zfy01',tag:'INTERACTIVE / LIGHT'},
  {id:'meowstar',title:'喵喵派对',type:'视觉交互',year:'2026',number:'09',image:'assets/projects/meowstar.webp',description:'翻看猫咪卡片，打开每只猫的独立档案。',preview:'meowstar',tag:'INTERACTIVE / EDITORIAL'},
  {id:'artist',title:'模特视觉',type:'视觉交互',year:'2026',number:'10',image:'assets/projects/artist.webp',description:'用滚动驱动影像序列，翻看人物肖像与模特卡片。',preview:'artist',tag:'INTERACTIVE / FASHION'},
  {id:'lingyu',title:'Lingo资源聚合平台',type:'产品设计',year:'持续迭代',number:'11',image:'assets/projects/lingo.webp',description:'集中浏览赛事活动、学习资源、实践项目和组队机会。',site:'https://www.lingozm.cn/',tag:'PRODUCT / EDUCATION'},
  {id:'cook',title:'CookIdea',type:'产品设计',year:'持续迭代',number:'12',image:'assets/projects/cook.webp',description:'把食材拖进锅里，调节火力，再根据手边食材生成食谱。',preview:'cook',tag:'PRODUCT / COOKING'}
];

