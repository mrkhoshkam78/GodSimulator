const NAMES_M = ["آریا","کیان","سامان","پارسا","نیما","بهرام","رادین","سیاوش","فرهاد","رستم","آرمان","دانیال"];
const NAMES_F = ["آوا","سارا","نیکا","رها","یاسمن","ستاره","لیانا","گلناز","مهتاب","هستی","النا","شهرزاد"];
const JOBS = ["کشاورز","بازرگان","درمانگر","آموزگار","صنعتگر","شاعر","نگهبان","کاتب","ماهیگیر","معمار","کیمیاگر","چوپان","بافنده","کاوشگر"];
const PLACES = ["دره مه","بندر طلایی","کوه سپید","بیشه کهن","شهر مهتاب","روستای باد","جزیره مهتاب","دشت ستاره"];
const VALUES = ["خانواده","دانش","عدالت","آزادی","ایمان","ثروت","هنر","بقا"];
const FEARS = ["تنهایی","مرگ","فقر","خیانت","بیماری","فراموشی","قحطی","جنگ"];

const EMOTIONS = ["happiness","sadness","anger","fear","anxiety","hope","love","jealousy","loneliness","trust","hate","peace"];
const EMOTION_FA = {
  happiness:"شادی", sadness:"غم", anger:"خشم", fear:"ترس", anxiety:"اضطراب",
  hope:"امید", love:"عشق", jealousy:"حسادت", loneliness:"تنهایی",
  trust:"اعتماد", hate:"نفرت", peace:"آرامش"
};
const TRAITS = ["intelligence","creativity","courage","kindness","pride","patience","ambition","curiosity"];
const TRAIT_FA = {
  intelligence:"هوش", creativity:"خلاقیت", courage:"شجاعت", kindness:"مهربانی",
  pride:"غرور", patience:"صبر", ambition:"جاه‌طلبی", curiosity:"کنجکاوی"
};

const POWER_CATS = [
  { id:"direct", title:"کنترل مستقیم انسان", powers:[
    {id:"emotion", name:"تغییر احساسات", desc:"تنظیم شادی، غم، خشم و دیگر احساسات"},
    {id:"personality", name:"تغییر شخصیت", desc:"تغییر شجاعت، مهربانی، غرور و جاه‌طلبی"},
    {id:"thoughts", name:"کنترل افکار", desc:"ایجاد فکر، ایده یا الهام تازه"},
    {id:"memories", name:"تغییر خاطرات", desc:"حذف، تقویت یا ساخت خاطره داستانی"},
    {id:"behavior", name:"کنترل رفتار", desc:"دستور انجام یا توقف یک عمل"}
  ]},
  { id:"fate", title:"زندگی و سرنوشت", powers:[
    {id:"heal", name:"شفای کامل", desc:"درمان بیماری و بازیابی سلامت"},
    {id:"lifespan", name:"اعطای عمر", desc:"افزایش طول عمر"},
    {id:"revive", name:"احیای مردگان", desc:"بازگرداندن فرد فوت‌شده"},
    {id:"destiny", name:"تغییر سرنوشت", desc:"ایجاد فرصت تازه در مسیر زندگی"},
    {id:"create", name:"تولد و آفرینش", desc:"خلق انسان جدید"}
  ]},
  { id:"cosmos", title:"قدرت‌های کیهانی", powers:[
    {id:"time", name:"کنترل زمان", desc:"توقف، شتاب یا بازگرداندن زمان"},
    {id:"weather", name:"کنترل آب‌وهوا", desc:"باران، طوفان، خشکسالی یا هوای مطلوب"},
    {id:"resources", name:"ایجاد منابع", desc:"غذا، آب، طلا و مواد کمیاب"},
    {id:"laws", name:"تغییر قوانین جهان", desc:"تغییر قوانین فیزیکی یا اجتماعی"},
    {id:"disaster", name:"ایجاد فاجعه", desc:"زلزله، سیل یا آتش‌سوزی"}
  ]},
  { id:"aware", title:"آگاهی و ارتباط الهی", powers:[
    {id:"seeThoughts", name:"مشاهده افکار", desc:"دیدن نگرانی‌های فعلی فرد"},
    {id:"seeMemories", name:"مشاهده خاطرات", desc:"مرور گذشته فرد"},
    {id:"hearPrayers", name:"شنیدن دعاها", desc:"فهرست درخواست‌ها"},
    {id:"message", name:"ارسال پیام الهی", desc:"سخن گفتن با انسان"},
    {id:"dream", name:"ارسال رؤیا و نشانه", desc:"خواب یا الهام تأثیرگذار"}
  ]},
  { id:"influence", title:"پاداش، مجازات و نفوذ", powers:[
    {id:"wealth", name:"اعطای ثروت", desc:"افزایش دارایی و درآمد"},
    {id:"knowledge", name:"اعطای دانش", desc:"مهارت و توانایی یادگیری"},
    {id:"bless", name:"برکت و خوش‌شانسی", desc:"افزایش رویدادهای مثبت"},
    {id:"punish", name:"مجازات الهی", desc:"پیامد داستانی متناسب"},
    {id:"relations", name:"تغییر روابط", desc:"تقویت یا تضعیف پیوندها"}
  ]},
  { id:"absolute", title:"کنترل مطلق جهان", powers:[
    {id:"civilization", name:"خلق تمدن", desc:"گروهی با فرهنگ و ساختار"},
    {id:"tech", name:"تغییر فناوری", desc:"بالا یا پایین بردن سطح فناوری"},
    {id:"society", name:"کنترل قوانین اجتماعی", desc:"اقتصاد و حکومت"},
    {id:"rewrite", name:"حذف یا بازنویسی رویداد", desc:"تغییر تاریخ جهان"},
    {id:"command", name:"فرمان مطلق", desc:"دستور سفارشی روی فرد یا جهان"}
  ]}
];

const POWER_UI = {
  emotion: {scope:["one","selected","world"], target:true, fields:[
    {id:"key", type:"select", label:"احساس", options:Object.entries(EMOTION_FA).map(([k,v])=>({value:k,label:v}))},
    {id:"value", type:"range", label:"شدت", min:0, max:100, value:80}
  ]},
  personality: {scope:["one","selected"], target:true, fields:[
    {id:"key", type:"select", label:"ویژگی", options:Object.entries(TRAIT_FA).map(([k,v])=>({value:k,label:v}))},
    {id:"value", type:"range", label:"مقدار", min:0, max:100, value:75}
  ]},
  thoughts: {scope:["one","selected"], target:true, fields:[
    {id:"text", type:"text", label:"اندیشه یا الهام", placeholder:"فکری که در دلش می‌نشیند"}
  ]},
  memories: {scope:["one"], target:true, fields:[
    {id:"mode", type:"select", label:"عمل", options:[{value:"add",label:"افزودن خاطره"},{value:"clear",label:"محو کردن گذشته"}]},
    {id:"text", type:"text", label:"متن خاطره", placeholder:"خاطره‌ای که باید کاشته شود"}
  ]},
  behavior: {scope:["one","selected"], target:true, fields:[
    {id:"text", type:"text", label:"فرمان رفتار", placeholder:"به خانه بازگردد و آرام بماند"}
  ]},
  heal: {scope:["one","selected","world"], target:true, fields:[]},
  lifespan: {scope:["one","selected"], target:true, fields:[
    {id:"value", type:"number", label:"سال افزوده", value:12}
  ]},
  revive: {scope:["one","selected"], target:"dead", fields:[]},
  destiny: {scope:["one"], target:true, fields:[
    {id:"text", type:"text", label:"مسیر تازه", placeholder:"هدف یا سرنوشت جدید"}
  ]},
  create: {scope:["world"], target:false, fields:[
    {id:"name", type:"input", label:"نام"},
    {id:"gender", type:"select", label:"جنسیت", options:[{value:"مرد",label:"مرد"},{value:"زن",label:"زن"}]},
    {id:"age", type:"number", label:"سن", value:18},
    {id:"job", type:"input", label:"شغل"}
  ]},
  time: {scope:["world"], target:false, fields:[
    {id:"mode", type:"select", label:"فرمان زمان", options:[
      {value:"pause",label:"توقف"},{value:"normal",label:"عادی"},{value:"fast",label:"شتاب"},{value:"rewind",label:"بازگشت به نقطه ذخیره"}
    ]}
  ]},
  weather: {scope:["world"], target:false, fields:[
    {id:"text", type:"select", label:"آسمان", options:["باران مطلوب","طوفان","خشکسالی","برف","آسمان صاف"].map(x=>({value:x,label:x}))}
  ]},
  resources: {scope:["one","world"], target:true, fields:[
    {id:"kind", type:"select", label:"منبع", options:["طلا","غذا","آب"].map(x=>({value:x,label:x}))}
  ]},
  laws: {scope:["world"], target:false, fields:[
    {id:"text", type:"text", label:"قانون تازه", placeholder:"قانونی که بر جهان می‌نشیند"}
  ]},
  disaster: {scope:["world"], target:false, fields:[
    {id:"text", type:"select", label:"فاجعه", options:["زلزله","سیل","آتش‌سوزی","طوفان سهمگین"].map(x=>({value:x,label:x}))}
  ]},
  seeThoughts: {scope:["one"], target:true, fields:[]},
  seeMemories: {scope:["one"], target:true, fields:[]},
  hearPrayers: {scope:["one","world"], target:true, fields:[]},
  message: {scope:["one","selected"], target:true, fields:[
    {id:"text", type:"text", label:"پیام الهی", placeholder:"سخنی که در درونشان طنین می‌اندازد"}
  ]},
  dream: {scope:["one","selected"], target:true, fields:[
    {id:"text", type:"text", label:"رؤیا", placeholder:"صحنه‌ای که در خواب می‌بینند"}
  ]},
  wealth: {scope:["one","selected"], target:true, fields:[
    {id:"value", type:"number", label:"مقدار ثروت", value:80}
  ]},
  knowledge: {scope:["one","selected"], target:true, fields:[]},
  bless: {scope:["one","selected","world"], target:true, fields:[]},
  punish: {scope:["one","selected"], target:true, fields:[]},
  relations: {scope:["one"], target:true, fields:[
    {id:"value", type:"range", label:"تغییر پیوند (−۵۰ تا ۵۰)", min:-50, max:50, value:20}
  ]},
  civilization: {scope:["world"], target:false, fields:[
    {id:"text", type:"input", label:"نام تمدن", placeholder:"تمدن سپیده"}
  ]},
  tech: {scope:["one","world"], target:true, fields:[
    {id:"value", type:"number", label:"تغییر سطح فناوری", value:1}
  ]},
  society: {scope:["world"], target:false, fields:[
    {id:"text", type:"text", label:"نظام اجتماعی", placeholder:"قانون جامعه و اقتصاد"}
  ]},
  rewrite: {scope:["world"], target:false, fields:[
    {id:"text", type:"text", label:"بازنویسی تاریخ", placeholder:"آنچه باید در تاریخ بماند"}
  ]},
  command: {scope:["one","selected","world"], target:true, fields:[
    {id:"text", type:"text", label:"فرمان مطلق", placeholder:"دستوری که جهان باید بپذیرد"}
  ]}
};

const PRAYER_TOPICS = [
  {topic:"سلامتی", texts:["بدنم دیگر یارای ایستادن ندارد؛ اگر هنوز به جان‌ها نظر داری، نیرویم را بازگردان.","تب و رنج امانم نمی‌دهد. یک نشانهٔ شفا برایم بس است.","از بیماری می‌ترسم بیش از مرگ؛ بگذار دوباره نفس راحت بکشم."]},
  {topic:"عشق", texts:["در این جهان پر هیاهو دلی می‌خواهم که مرا بدون نقاب ببیند.","تنهایی مثل زمستان طولانی شده؛ اگر عشقی برایم نوشته‌ای، راهش را نشان بده.","می‌ترسم دیگر کسی را نیابم. اگر می‌شنوی، یک تقاطع کوچک کافی است."]},
  {topic:"خانواده", texts:["خانواده‌ام تنها تکیه‌گاهم است؛ از سایهٔ خود آنان را محروم نکن.","برای فرزندان و نزدیکانم دعا می‌کنم، نه برای خودم.","خانه بی‌تو سرد است. آرامش را به درگاه ما برگردان."]},
  {topic:"ثروت", texts:["سفره تنگ شده و شرمسار نگاه‌های گرسنه‌ام. راه روزی را بگشا.","نه طمع ثروت گزاف، فقط نان فردا را می‌خواهم.","قرض و تنگدستی گلویم را فشرده؛ یک گشایش کوچک کافی است."]},
  {topic:"موفقیت", texts:["کارم به بن‌بست خورده. اگر تقدیری برایم مانده، دری تازه باز کن.","سال‌ها کوشیدم و هنوز در جا می‌زنم. نشانه‌ای بده که راه را اشتباه نرفته‌ام.","می‌خواهم برای هدفم مفید باشم، نه فقط زنده بمانم."]},
  {topic:"امنیت", texts:["شب‌ها از سایه می‌ترسم. کوچه‌هایمان را از بیم خالی کن.","آرامش را از ما گرفته‌اند. پناهگاهی بفرست.","اگر جهان را نگه می‌داری، ما را هم در پناه خود بگیر."]},
  {topic:"بخشش", texts:["خطاهایم مثل زنجیر به پایم بسته. دلم را سبک کن.","نمی‌دانم بخشیده می‌شوم یا نه؛ فقط می‌خواهم دوباره بتوانم نگاه کنم.","اگر بخشش در دست توست، سهم کوچکی به من بده."]},
  {topic:"امید", texts:["چراغ امیدم کم‌سو شده. اگر هنوز صدایم را می‌شنوی، آن را روشن کن.","دیگر باور ندارم فردا بهتر باشد — مگر تو بگویی.","یک جرقه امید برای ادامه دادن می‌خواهم، نه معجزهٔ بزرگ."]},
  {topic:"دانش", texts:["تشنهٔ فهمم. پرده از یک راز کوچک بردار.","چشم عقلم را روشن کن تا راه را از بیراهه بازشناسم.","دانش را بر من مبند؛ شاید همان یک حقیقت، جهانم را عوض کند."]},
  {topic:"نجات دیگران", texts:["برای کسی دعا می‌کنم که دوستش دارم؛ رنجش را کم کن حتی اگر سهم من هیچ باشد.","جان عزیزم در خطر است. اگر باید کسی را نجات دهی، او را برگزین.","درد او درد من است. دستت را به سویش دراز کن."]}
];

const DIVINE_COST = {
  emotion:8, personality:12, thoughts:6, memories:14, behavior:10,
  heal:15, lifespan:20, revive:35, destiny:18, create:25,
  time:10, weather:12, resources:14, laws:22, disaster:30,
  seeThoughts:2, seeMemories:2, hearPrayers:1, message:8, dream:7,
  wealth:16, knowledge:14, bless:12, punish:12, relations:10,
  civilization:28, tech:15, society:20, rewrite:18, command:24
};
