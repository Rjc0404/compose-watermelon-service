var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { createPool } = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const cron = require('node-cron');
const dayjs = require('dayjs');
const weekday = require('dayjs/plugin/weekday');
const locale = require('dayjs/locale/zh-cn');

dayjs.extend(weekday);
dayjs.locale(locale);

const rankTipList = require('./rank.json');
// 昵称列表
const nicknameList = [
  '桃桃奶冻',
  '蓝莓软糖',
  '橙意满满',
  '草莓啵啵',
  '荔枝气泡',
  '芒果糯米',
  '柠檬汽水',
  '西瓜冰沙',
  '葡萄奶霜',
  '菠萝吹雪',
  '车厘子酱',
  '牛油果泥',
  '杨梅小酿',
  '哈密瓜脆',
  '小橘快跑',
  '苹果不酸',
  '柚子醒醒',
  '青提侦探',
  '山竹穿云',
  '蜜橘特工',
  '石榴籽籽',
  '椰椰大侠',
  '柿子椒椒',
  '杏子汽水',
  '糖心苹果',
  '盐渍青梅',
  '焦糖菠萝',
  '蜂蜜柚子',
  '话梅硬糖',
  '奶盖草莓',
  '柠檬挤挤',
  '香蕉划桨',
  '草莓蹦迪',
  '蓝莓跳格子',
  '菠萝吨吨桶',
  '椰子砸核桃',
  '葡萄不愤怒',
  '芒果冰美式',
  '荔枝气泡水',
  '西瓜挖着吃',
  '哈密瓜披萨',
  '柠檬皱眉头',
  '石榴吐籽籽',
  '西瓜忍者',
  '椰子高达',
  '橘子皮卡丘',
  '甘蔗糖葫芦',
  '杨梅冰汤圆',
  '梨不开你',
  '橙蒙厚爱',
  '桃之夭夭',
  '柚点过分',
  '杏好有你',
]

var app = express();

// 读取证书和私钥文件
const privateKey = fs.readFileSync(path.join(__dirname, '../jiancheng.asia.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, '../jiancheng.asia_bundle.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

// 创建 HTTPS 服务器
const httpsServer = https.createServer(credentials, app);

// 处理跨域
app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


// 配置 multer 中间件
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/'); // 上传文件的保存目录
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // 文件名
  }
});

const upload = multer({ storage: storage });

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// 使用 body-parser 解析表单数据
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 使用连接池
const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: '!Rjc15198238500',
  database: 'watermelon',
  waitForConnections: true, // 连接池无空闲连接时是否等待
  connectionLimit: 10, // 最大连接数（根据并发量调整）
  queueLimit: 0, // 等待队列长度（0 表示无限制）
  enableKeepAlive: true, // 启用保持活动状态
  keepAliveInitialDelay: 0, // 保持活动状态的初始延迟时间，单位为毫秒
});

cron.schedule('0 0 * * 1', async () => {
  try {
    // 重置世界榜得分和截图
    const sql = `UPDATE users SET score = '0', screenshot = ''`;
    await pool.execute(sql);
    console.log('世界榜得分和截图数据重置成功');
    // 清空点赞表
    const sql2 = `DELETE FROM likes`;
    await pool.execute(sql2);
    console.log('点赞表数据清空成功');
  } catch (error) {
    console.error('数据库操作错误:', error);
  }
});

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

app.get('/watermelon/login', async (req, res) => {
  try {
    const { code } = req.query;
    // 发送请求获取openid
    const response = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=wx822d64f986b66190&secret=d1518b22a1f0b1a72e97f448acda7802&grant_type=authorization_code&js_code=${code}`);
    const data = response.data;
    // 查找openid是否存在
    const sql = `SELECT * FROM users WHERE openid = '${data.openid}'`;
    const [rows] = await pool.execute(sql);

    if (!rows || !rows.length) {
      // 获取0-52闭区间的随机整数
      const randomNumber = getRandomInt(0, 9);
      // 获取随机昵称
      const nickname = nicknameList[getRandomInt(0, nicknameList.length - 1)];
      // 保存openid
      const sql = `INSERT INTO users (openid,nickname,avatar,score) VALUES ('${data.openid}','${nickname}','${randomNumber}.png',0)`;
      await pool.execute(sql);
      res.json({
        openid: data.openid,
        success: true,
      });
    } else {
      res.json({
        openid: data.openid,
        success: true,
      });
    }
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 根据分数高低返回前100名排行榜数据
app.get('/watermelon/rank', async (req, res) => {
  let { page, pageSize } = req.query;
  page = page || 1;
  if (pageSize > 100) {
    pageSize = 100;
  }

  try {
    // 优化后的查询（使用索引覆盖）
    const sql = `
      SELECT u.id, u.openid, u.nickname, u.avatar, u.score, u.max_score, u.screenshot,
       COUNT(l.target_id) AS total_likes
      FROM users u
      LEFT JOIN likes l ON u.openid = l.target_id
      WHERE u.score > 0
      GROUP BY u.id
      ORDER BY u.score DESC, u.created_at ASC
      LIMIT ? OFFSET ?;
    `;
    // 按score排序，取前100条，且score大于0，且根据openid级联查询likes表的总数
    const [rows] = await pool.execute(sql, [pageSize, (page - 1) * pageSize]);
    // 获取总条数
    const totalSql = `SELECT COUNT(*) as count FROM users WHERE score > 0`;
    const [totalRows] = await pool.execute(totalSql);

    res.json({
      success: true,
      data: rows,
      total: totalRows[0].count,
    });
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 获取指定openid的信息和排名
app.post('/watermelon/user', async (req, res) => {
  const { openid } = req.body;
  const currMonday = dayjs().startOf('week').format("YYYY-MM-DD")

  try {
    // 获取我的信息
    const sql = `
      SELECT u.*, COUNT(l.target_id) AS total_likes
      FROM users u
      LEFT JOIN likes l ON u.openid = l.target_id
      WHERE u.openid = ?
      GROUP BY u.id
    `;

    // 执行查询
    const [rows] = await pool.execute(sql, [openid]);

    if (rows.length) {
      if (rows[0].score > 0) {
        // 获取我的排名
        const sql = `SELECT 
          (SELECT COUNT(*) 
            FROM users t2 
            WHERE t2.score > t1.score 
                OR (t2.score = t1.score AND t2.created_at < t1.created_at)
            ) + 1 as rank_num 
          FROM users t1 
          WHERE t1.openid = ?`;
        const [result] = await pool.execute(sql, [openid]);
        res.json({
          success: true,
          data: {
            ...rows[0],
            rank: result[0].rank_num
          },
          currDate: currMonday
        });
      } else {
        res.json({ success: true, data: rows[0], currDate: currMonday });
      }
    } else {
      res.json({ success: false, msg: '未找到用户信息', currDate: currMonday });
    }
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
})

// 获取指定openid的点赞记录
app.post('/watermelon/likes', async (req, res) => {
  const { openid } = req.body;
  try {
    // 按日期正序
    const sql = `SELECT id, openid, nickname, avatar, target_id, DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at FROM likes WHERE target_id = '${openid}' ORDER BY created_at ASC`;
    const [rows] = await pool.execute(sql);
    res.json({ success: true, data: {
      records: rows,
      timeStamp: Date.now(),
    } });
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
})
// 获取我点赞过的记录
app.post('/watermelon/getMyLikes', async (req, res) => {
  const { openid } = req.body;
  const sql = `SELECT id, openid, nickname, avatar, target_id, DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at FROM likes WHERE openid = '${openid}' ORDER BY created_at ASC`;
  const [rows] = await pool.execute(sql);
  res.json({ success: true, data: {
    records: rows,
    timeStamp: Date.now(),
  } });
})
// 点赞
app.post('/watermelon/savelikes', async (req, res) => {
  const { openid, target_id } = req.body;
  // 插入点赞记录
  const sql = `INSERT INTO likes (openid, nickname, avatar, target_id) SELECT '${openid}', nickname, avatar, '${target_id}' FROM users WHERE openid = '${openid}'`;
  await pool.execute(sql);
  res.json({ success: true });
})
// 点赞多个用户
app.post('/watermelon/saveAllLikes', async (req, res) => {
  const { openid, target_ids } = req.body;

  // 获取用户信息（仅查询一次）
  const [userRows] = await pool.execute(
    'SELECT nickname, avatar FROM users WHERE openid = ?',
    [openid]
  );

  if (userRows.length === 0) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  const { nickname, avatar } = userRows[0];

  // 开始事务
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 预编译插入语句
    const insertSql = 'INSERT INTO likes (openid, nickname, avatar, target_id) VALUES (?, ?, ?, ?)';

    // 执行多次插入
    for (const target_id of target_ids) {
      await connection.execute(insertSql, [openid, nickname, avatar, target_id]);
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('批量点赞失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  } finally {
    connection.release();
  }
});
// 保存指定openid的分数
app.post('/watermelon/saveScore', async (req, res) => {
  try {
    const { score, openid, max_score } = req.body;
    const currMonday = dayjs().startOf('week').format("YYYY-MM-DD")
    const prevMonday = dayjs().startOf('week').subtract(1, 'week').format("YYYY-MM-DD")
    let myRank = -1;
    const sql = `SELECT score FROM users WHERE openid = '${openid}'`;

    const [myRows] = await pool.execute(sql);
    // console.log(myRows, '111111');
    // 如果score小于查出来的score，则不更新
    if (score > myRows[0].score) {
      // 查询我的当前排名
      const sql2 = `SELECT (SELECT COUNT(*) FROM users t2 WHERE t2.score > t1.score) + 1 as rank_num FROM users t1 WHERE t1.openid = ?`;
      const [rows] = await pool.execute(sql2, [openid]);
      // console.log(rows, '222222');
      myRank = rows[0].rank_num;

      // 更新指定openid的score和max_score
      const sql3 = `UPDATE users SET score = '${score}', max_score = '${score > max_score ? score : max_score}' WHERE openid = '${openid}'`;
      await pool.execute(sql3);

      // 查询比该 score 大的记录数量，即排名
      const sql4 = `SELECT COUNT(*) as rank FROM users WHERE score > ?`;
      const [rankRows] = await pool.execute(sql4, [score]);
      const rank = rankRows[0].rank + 1;
      // console.log(rank, '333333');

      if (rank < myRank || myRows[0].score == 0) {
        res.json({ score, rank, success: true, tip: rankTipList[rank - 1] && rankTipList[rank - 1].tip, currDate: currMonday, prevWeekDate: prevMonday });
      } else {
        res.json({ score, rank: -1, success: true, currDate: currMonday, prevWeekDate: prevMonday });
      }
    } else {
      res.json({ success: true, score: myRows[0].score, rank: -1, currDate: currMonday, prevWeekDate: prevMonday });
    }
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 保存指定openid的昵称
app.post('/watermelon/updateNickname', async (req, res) => {
  try {
    const { nickname, openid } = req.body;
    const sql = `UPDATE users SET nickname = '${nickname}' WHERE openid = '${openid}'`;
    const [rows] = await pool.execute(sql);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 保存指定openid的头像
app.post('/watermelon/uploadAvatar', upload.single('file'), async (req, res) => {
  try {
    let fileName = req.file.filename;
    const { openid } = req.body;
    const sql = `UPDATE users SET avatar = '${fileName}' WHERE openid = '${openid}'`;
    await pool.execute(sql);

    res.json({ success: true, filename: fileName });
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// 接收头像 URL 并下载保存
app.post('/watermelon/saveAvatarNickname', async (req, res) => {
  const { avatarUrl, openid, nickname } = req.body;

  try {
    if (!avatarUrl) throw new Error('头像不能为空');

    // 下载头像文件
    const response = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
    const fileBuffer = response.data;
    const fileName = `${Date.now()}.jpg`; // 生成唯一文件名（时间戳+扩展名）
    const filePath = path.join(__dirname, 'public/images/', fileName);

    // 保存文件到服务器
    fs.writeFileSync(filePath, fileBuffer);

    const sql = `UPDATE users SET avatar = '${fileName}', nickname = '${nickname}' WHERE openid = '${openid}'`;
    await pool.execute(sql);

    res.json({ success: true, filename: fileName });
  } catch (error) {
    console.error('下载/保存头像失败:', error);
    res.status(500).json({ code: 500, msg: '服务器内部错误' });
  }
});

// 保存截图
app.post('/watermelon/upload', upload.single('file'), async (req, res) => {
  try {
    let fileName = req.file.filename;
    const { openid } = req.body;
    const sql = `UPDATE users SET screenshot = '${fileName}' WHERE openid = '${openid}'`;
    await pool.execute(sql);

    res.json({ success: true, filename: fileName });
  } catch (error) {
    console.error('数据库操作错误:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// 获取随机整数
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

httpsServer.listen(8000, () => {
  console.log(`服务器正在监听端口 8000`);
});

module.exports = app;
