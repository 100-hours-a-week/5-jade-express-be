const express = require('express');
const router = express.Router();
//const fs = require('fs');
const path = require('path');
const bdps = require('body-parser');
const session = require('express-session');
//const fileStore = require('session-file-store')(session);
const env = require('dotenv').config();
const db = require('../config/mysql');
const conn = db.init();

const dbStore = require('express-mysql-session')(session);
const mySQLStore = new dbStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE, 
    createDatabaseTable: false, 
    schema: {
        tableName: 'Session', 
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});
router.use(bdps.urlencoded({extended:true}));
router.use(bdps.json());

router.use(session({
    secure: false, // http 환경에서도 session 정보를 주고받도록 처리
    secret: process.env.SESSION_SECRET, // session id를 암호화하기 위한 키, 실제 사용시에는 노출되지 않도록 처리해야 함
    resave: false, // session을 언제나 저장할지 설정
    saveUninitialized: true, // 초기화되지 않은 session을 저장
    cookie: {
      httpOnly: true, // 클라이언트에서 쿠키를 확인하지 못하도록 설정
      secure: false,
      maxAge: 60*200000
    },
    name: 'session-name',
    store: mySQLStore
    //store: new fileStore()
}));

// db 코드
// 로그인 세션 생성 - POST
// body - email, password
router.post('/login', (req, res) => {
    try{
        if(req.session.userId){
            return res.status(402).send('Already logged in');
        }
        const { email, password } = req.body;
        const query = `SELECT * FROM User WHERE email="${email}" AND password="${password}"`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(401).send('Invalid email or password');
            }
            if(result[0].valid == false){
                return res.status(401).send('User not valid');
            }
            if(!(req.session.userId)) {
                req.session.userId = result[0].userId;
                req.session.save(()=>{
                });
            }
            return res.status(200).send('Logged in');
        });
    } catch(err) {
        return res.status(500).send('Internal Server Error2');
    }
});

// 로그아웃
router.post('/logout', (req, res) => {
    if(!req.session.userId){
        return res.status(400).send('Session expired');
    }
    req.session.destroy(err => {
        if(err) {
            return res.status(500).send('Internal Server Error1');
        }
    }
    );
    return res.status(200).send("Logout Success");
});

// 게시글 목록 페이지 - GET
router.get('/post', (req, res) => {
    try{
        const query = `SELECT * FROM Post WHERE valid=true`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('No data found');
            }
            res.send(result);
        });
    }
    catch(err) {
        res.status(500).send('Internal Server Error2');
    }
});

// 게시글 상세 페이지 - GET
router.get('/post/:postId', (req, res) => {
    try{
        const query = `SELECT * FROM Post WHERE postId=${parseInt(req.params.postId)}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('Post not found');
            }
            if(result[0].valid == false){
                return res.status(404).send('Post not valid');
            }
            res.send(result[0]);
        });
    } catch(err) {
        res.status(500).send('Internal Server Error2');
    }
});

// 게시글 작성 - POST
// body - title, content, image
router.post('/post', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const { title, content, image } = req.body;
        const query = `INSERT INTO Post (userId, title, image, content, valid) 
        VALUES (${req.session.userId}, "${title}", "${image}", "${content}", true)`;
        conn.query(query, (err, result) => {
            if(err) {
                console.log(err);
                return res.status(500).send('Internal Server Error1');
            }
            res.status(200).send('Post created');
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 게시글 수정 페이지 - PATCH
// param - postId
// body - title, content, image
router.patch('/post/:postId', (req, res) => {
    try{
        // 세션 확인
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const query = `SELECT * FROM Post WHERE postId=${parseInt(req.params.postId)}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('Post not found');
            }
            if(result[0].valid == false){
                return res.status(404).send('Post not valid');
            }
            if(result[0].userId !== req.session.userId) {
                return res.status(400).send('No permission to edit post');
            }
            const {title, content, image} = req.body;
            const query2 = `UPDATE Post SET title="${title}", content="${content}", image="${image}" WHERE postId=${parseInt(req.params.postId)}`;
            conn.query(query2, (err, result) => {
                if(err) {
                    return res.status(500).send('Internal Server Error2');
                }
                res.status(200).send("Post editted");
            });
        });
    } catch(err) {
        res.status(500).send('Internal Server Error3');
    }
});

// 게시글 삭제 - DELETE
// param - postId
router.delete('/post/:postId', (req, res) => {
    if(!req.session.userId){
        return res.status(400).send('Session expired');
    }
    const query = `SELECT * FROM Post WHERE postId=${parseInt(req.params.postId)}`;
    conn.query(query, (err, result) => {
        if(err) {
            return res.status(500).send('Internal Server Error1');
        }
        if(result.length === 0) {
            return res.status(404).send('Post not found');
        }
        if(result[0].valid == false){
            return res.status(404).send('Post not valid');
        }
        if(result[0].userId !== req.session.userId) {
            return res.status(400).send('No permission to delete post');
        }
        const query2 = `UPDATE Post SET valid=false WHERE postId=${parseInt(req.params.postId)}`;
        conn.query(query2, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error2');
            }
            res.status(200).send("Post deleted");
        });
    });
});

// 댓글 조회 - GET
// param - postId
router.get('/comments/:postId', (req, res) => {
    const query = `SELECT * FROM Comment WHERE postId=${parseInt(req.params.postId)} AND valid=true`;
    conn.query(query, (err, result) => {
        if(err) {
            return res.status(500).send('Internal Server Error1');
        }
        if(result.length === 0) {
            return res.status(404).send('Post || Comment not found');
        }
        res.send(result);
    });
});

// 댓글 개별 조회 - GET
// param - commentId
router.get('/comment/:commentId', (req, res) => {
    const query = `SELECT * FROM Comment WHERE commentId=${parseInt(req.params.commentId)}`;
    conn.query(query, (err, result) => {
        if(err) {
            return res.status(500).send('Internal Server Error1');
        }
        if(result.length === 0) {
            return res.status(404).send('Comment not found');
        }
        if(result[0].valid == false){
            return res.status(404).send('Comment not valid');
        }
        res.send(result[0]);
    });
});

// 댓글 작성 - POST
// param - postId
// body - text
router.post('/comment/:postId', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const { text } = req.body;
        const query = `SELECT * FROM Post WHERE postId=${parseInt(req.params.postId)}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('Post not found');
            }
            if(result[0].valid == false){
                return res.status(404).send('Post not valid');
            }
            const post = result[0];
            const query2 = `INSERT INTO Comment (postId, userId, text, valid)
            VALUES (${parseInt(req.params.postId)}, ${req.session.userId}, "${text}", true)`;
            conn.query(query2, (err
                , result) => {
                if(err) {
                    return res.status(500).send('Internal Server Error2');
                }
                const query3 = `UPDATE Post SET comments=${post.comments+1} WHERE postId=${parseInt(req.params.postId)}`;
                conn.query(query3, (err
                    , result) => {
                    if(err) {
                        return res.status(500).send('Internal Server Error3');
                    }
                    res.status(200).send("Comment created");
                });
            });
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 댓글 수정 - PATCH
// param - commentId
// body - text
router.patch('/comment/:commentId', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const { text } = req.body;
        const query = `SELECT * FROM Comment WHERE commentId=${parseInt(req.params.commentId)}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('Comment not found');
            }
            if(result[0].valid == false){
                return res.status(404).send('Comment not valid');
            }
            if(result[0].userId !== req.session.userId) {
                return res.status(400).send('No permission to edit comment');
            }
            const query2 = `UPDATE Comment SET text="${text}" WHERE commentId=${parseInt(req.params.commentId)}`;
            conn.query(query2, (err, result) => {
                if(err) {
                    return res.status(500).send('Internal Server Error2');
                }
                return res.status(200).send("Comment editted");
            });
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 댓글 삭제 - DELETE
// param - commentId
router.delete('/comment/:commentId', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const query = `SELECT * FROM Comment WHERE commentId=${parseInt(req.params.commentId)}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('Comment not found');
            }
            if(result[0].valid == false){
                return res.status(404).send('Comment not valid');
            }
            if(result[0].userId !== req.session.userId) {
                return res.status(400).send('No permission to delete comment');
            }
            const query2 = `UPDATE Comment SET valid=false WHERE commentId=${parseInt(req.params.commentId)}`;
            conn.query(query2, (err, result) => {
                if(err) {
                    return res.status(500).send('Internal Server Error2');
                }
                return res.status(200).send("Comment deleted");
            });
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 유저 - GET
router.get('/users', (req, res) => {
    try{
        const query = `SELECT * FROM User`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('No data found');
            }
            res.send(result);
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 유저 개별 조회 - GET
// param - userId
router.get('/user/:userId', (req, res) => {
    try{
        const query = `SELECT * FROM User WHERE userId=${parseInt(req.params.userId)}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('User not found');
            }
            if(result[0].valid == false){
                return res.status(404).send('User not valid');
            }
            res.send(result[0]);
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 프로필 수정 페이지 - GET
router.get('/user', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const query = `SELECT * FROM User WHERE userId=${req.session.userId}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('User not found');
            }
            if(result[0].valid == false){
                return res.status(405).send('User not valid');
            }
            res.status(200).send(result[0]);
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 회원가입 - POST
// body - email, password, nickname, profile_image
router.post('/user', (req, res) => {
    try{
        const { email, password, nickname, profile_image } = req.body;
        const query = `INSERT INTO User (email, password, nickname, profile_image, valid)
        VALUES ("${email}", "${password}", "${nickname}", "${profile_image}", true)`;
        conn.query(query, (err, result) => {
            if(err) {
                console.log(err);
                return res.status(500).send('Internal Server Error1');
            }
            res.status(200).send('User created');
        });
    }
    catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 닉네임 검사 - POST
// body - nickname
router.post('/nickname', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const { nickname } = req.body;
        const query = `SELECT * FROM User WHERE nickname="${nickname}"`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(200).send('Nickname available');
            }
            else {
                return res.status(300).send('Nickname already exists');
            }
        });
    }
    catch(err){

    }
});

// 프로필 수정 - PATCH
// body - nickname, (profile_image - 보류)
router.patch('/user', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const { nickname } = req.body;
        const query = `SELECT * FROM User WHERE nickname="${nickname}"`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                const query2 = `UPDATE User SET nickname="${nickname}" WHERE userId=${req.session.userId}`;
                conn.query(query2, (err, result) => {
                    if(err) {
                        return res.status(500).send('Internal Server Error1');
                    }
                    res.status(200).send('User updated');
                });
            }
            else {
                return res.status(404).send('Nickname already exists');
            }
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 회원탈퇴 - DELETE
router.delete('/user', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const query = `SELECT * FROM User WHERE userId=${req.session.userId}`;
        conn.query(query, (err, result) => {
            if(err) {
                return res.status(500).send('Internal Server Error1');
            }
            if(result.length === 0) {
                return res.status(404).send('User not found');
            }
            if(result[0].valid == false){
                return res.status(404).send('User not valid');
            }
            // user 삭제
            const query2 = `UPDATE User SET valid=false WHERE userId=${req.session.userId}`;
            conn.query(query2, (err, result) => {
                if(err) {
                    return res.status(500).send('Internal Server Error2');
                }
                req.session.destroy(err => {
                    if(err) {
                        return res.status(500).send('Internal Server Error3');
                    }
                });
                res.status(200).send('User deleted');
                const query3 = `UPDATE Post SET valid=false WHERE userId=${req.session.userId}`;
                // 사용자가 작성한 게시글 삭제
                conn.query(query3, (err, result) => {
                    if(err) {
                        return res.status(500).send('Internal Server Error4');
                    }
                    const query4 = `UPDATE Comment SET valid=false WHERE userId=${req.session.userId}`;
                    // 사용자가 작성한 댓글 삭제
                    conn.query(query4, (err, result) => {
                        if(err) {
                            return res.status(500).send('Internal Server Error5');
                        }
                        res.status(200).send('User deleted');
                    });
                });
            });
        });
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 비밀번호 수정 - PATCH
// body - password
router.patch('/user/password', (req, res) => {
    if(!req.session.userId){
        return res.status(400).send('Session expired');
    }
    const { password } = req.body;
    const query = `UPDATE User SET password="${password}" WHERE userId=${req.session.userId}`;
    conn.query(query, (err, result) => {
        if(err) {
            return res.status(500).send('Internal Server Error1');
        }
        res.status(200).send('Password changed');
    });
});


/*
// 세션 코드 -------------------------------------------
// 로그인 세션 생성 - POST
// body - email, password
router.post('/login', (req, res) => {
    try{
        if(req.session.userId){
            return res.status(402).send('Already logged in');
        }
        const data = fs.readFileSync('data/user.json', 'utf8');
        const users = JSON.parse(data);
        const { email, password } = req.body;
        const user = users.find(user => user.email === email && user.password === password);
        if(user) {
            if(!(req.session.userId)) {
                req.session.userId = user.userId;
                req.session.save(()=>{
                });
            }
            return res.status(200).send('Logged in');
        } else {
            return res.status(401).send('Invalid email or password');
        }
    } catch(err) {
        return res.status(500).send('Internal Server Error');
    }
});

// 로그아웃
router.post('/logout', (req, res) => {
    if(!req.session.userId){
        return res.status(400).send('Session expired');
    }
    req.session.destroy(err => {
        if(err) {
            return res.status(500).send('Internal Server Error');
        }
    }
    );
    return res.status(200).send("Logout Success");
});
// -----------------------------------------------------

// 게시글 목록 페이지 - GET
router.get('/post', (req, res) => {
    try{
        const data = fs.readFileSync('data/post.json', 'utf8');
        const posts = JSON.parse(data);
        res.send(posts);
    }
    catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 게시글 상세 페이지 - GET
router.get('/post/:postId', (req, res) => {
    try{
        const data = fs.readFileSync('data/post.json', 'utf8');
        const posts = JSON.parse(data);
        const post = posts.find(post => post.postId === parseInt(req.params.postId));
        if(!post) {
            return res.status(404).send('Post not found');
        } else {
            res.status(200).send(post);
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 게시글 작성 - POST
// body - title, content, image
router.post('/post', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const data = fs.readFileSync('data/post.json', 'utf8');
        const posts = JSON.parse(data);
        const { title, content, image } = req.body;
        const date = new Date();
        const month = (date.getMonth()+1).toString().padStart(2, '0');
        const day = (date.getDate()+1).toString().padStart(2, '0');
        const hour = (date.getHours()+1).toString().padStart(2, '0');
        const minute = (date.getMinutes()+1).toString().padStart(2, '0');
        const second = (date.getSeconds()+1).toString().padStart(2, '0');
        const post = { 
            postId: posts.length + 1, 
            writer: req.session.userId, 
            title: title, 
            time: `${date.getFullYear()}-${month}-${day} ${hour}:${minute}:${second}`,
            image: image,
            content: content,
            likes: 0,
            views: 0,
            comments: 0
        };
        posts.push(post);
        fs.writeFileSync('data/post.json', JSON.stringify(posts));
        res.status(200).send('Post created');
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 게시글 수정 페이지 - PATCH
// param - postId
// body - title, content, image
router.patch('/post/:postId', (req, res) => {
    try{
        // 세션 확인
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const data = fs.readFileSync('data/post.json', 'utf8');
        const posts = JSON.parse(data);
        const post = posts.find(post => post.postId === parseInt(req.params.postId));
        const {title, content, image} = req.body;
        if(!post) {
            return res.status(500).send("Internal Server Error");
        } else if(post.writer !== req.session.userId) {
            return res.status(400).send('No permission to edit post');
        } else {
            post.title = title;
            post.content = content;
            post.image = image;
            fs.writeFileSync('data/post.json', JSON.stringify(posts));
            res.status(200).send("Post editted");
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 게시글 삭제 - DELETE
// param - postId
router.delete('/post/:postId', (req, res) => {
    if(!req.session.userId){
        return res.status(400).send('Session expired');
    }
    const data = fs.readFileSync('data/post.json', 'utf8');
    const posts = JSON.parse(data);
    const post = posts.find(post => post.postId === parseInt(req.params.postId));
    if(!post){
        return res.status(404).send('Post not found');
    } else if(post.writer !== req.session.userId) {
        return res.status(400).send('No permission to delete post');
    } else {
        posts.splice(posts.indexOf(post), 1);
        fs.writeFileSync('data/post.json', JSON.stringify(posts));
        res.status(200).send("Post deleted");
    }
});

// 댓글 조회 - GET
// param - postId
router.get('/comments/:postId', (req, res) => {
    const data = fs.readFileSync('data/comment.json', 'utf8');
    const comments = JSON.parse(data);
    const comment = comments.filter(comment => comment.postId === parseInt(req.params.postId));
    if(!comment) {
        return res.status(404).send('Post not found');
    }else {
        res.send(comment);
    }
});

// 댓글 개별 조회 - GET
// param - commentId
router.get('/comment/:commentId', (req, res) => {
    const data = fs.readFileSync('data/comment.json', 'utf8');
    const comments = JSON.parse(data);
    const comment = comments.find(comment => comment.commentId === parseInt(req.params.commentId));
    if(!comment) {
        return res.status(404).send('Comment not found');
    } else {
        res.send(comment);
    }
});

// 댓글 작성 - POST
// param - postId
// body - text
router.post('/comment/:postId', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const { text } = req.body;
        const data = fs.readFileSync('data/comment.json', 'utf8');
        const postData = fs.readFileSync('data/post.json', 'utf8');
        const posts = JSON.parse(postData);
        const post = posts.find(post => post.postId === parseInt(req.params.postId));
        const comments = JSON.parse(data);
        const date = new Date();
        const month = (date.getMonth()+1).toString().padStart(2, '0');
        const day = (date.getDate()+1).toString().padStart(2, '0');
        const hour = (date.getHours()+1).toString().padStart(2, '0');
        const minute = (date.getMinutes()+1).toString().padStart(2, '0');
        const second = (date.getSeconds()+1).toString().padStart(2, '0');
        const comment = {
            commentId: comments.length + 1,
            postId: parseInt(req.params.postId),
            writer: req.session.userId,
            time: date.getFullYear()+'-'+month+'-'+day+' '+hour+':'+minute+':'+second,
            text: text
        };
        comments.push(comment);
        post.comments += 1;
        fs.writeFileSync('data/comment.json', JSON.stringify(comments));
        fs.writeFileSync('data/post.json', JSON.stringify(posts));
        res.status(200).send("Comment created");
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 댓글 수정 - PATCH
// param - commentId
// body - text
router.patch('/comment/:commentId', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const { text } = req.body;
        const data = fs.readFileSync('data/comment.json', 'utf8');
        const comments = JSON.parse(data);
        const comment = comments.find(comment => comment.commentId === parseInt(req.params.commentId));
        if(!comment) {
            return res.status(404).send('Comment not found');
        } else if(comment.writer !== req.session.userId) {
            return res.status(400).send('No permission to edit comment');
        } else {
            comment.text = text;
            fs.writeFileSync('data/comment.json', JSON.stringify(comments));
            res.status(200).send("Comment editted");
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 댓글 삭제 - DELETE
// param - commentId
router.delete('/comment/:commentId', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const data = fs.readFileSync('data/comment.json', 'utf8');
        const comments = JSON.parse(data);
        const comment = comments.find(comment => comment.commentId === parseInt(req.params.commentId));
        if(!comment){
            return res.status(404).send('Comment not found');
        } else if(comment.writer !== req.session.userId) {
            return res.status(400).send('No permission to delete comment');
        }
        else {
            comments.splice(comments.indexOf(comment), 1);
            fs.writeFileSync('data/comment.json', JSON.stringify(comments));
            res.status(200).send("Comment deleted");
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 유저 - GET
router.get('/users', (req, res) => {
    try{
        const data = fs.readFileSync('data/user.json', 'utf8');
        const users = JSON.parse(data);
        res.send(users);
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 프로필 수정 페이지 - GET
router.get('/user', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const data = fs.readFileSync('data/user.json', 'utf8');
        const users = JSON.parse(data);
        const user = users.find(user => user.userId === req.session.userId);
        if(!user) {
            return res.status(404).send('User not found');
        }
        res.status(200).send(user);
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 회원가입 - POST
// body - email, password, nickname, profile_image
router.post('/user', (req, res) => {
    try{
        const data = fs.readFileSync('data/user.json', 'utf8');
        const users = JSON.parse(data);
        const { email, password, nickname, profile_image } = req.body;
        const user = { 
            userId: users.length + 1, 
            email: email, 
            password: password, 
            nickname: nickname, 
            profile_image: profile_image
        };
        users.push(user);
        fs.writeFileSync('data/user.json', JSON.stringify(users))
        .then(res.status(200).send('User created'));
    }
    catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 프로필 수정 - PATCH
// body - nickname, (profile_image - 보류)
router.patch('/user', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const data = fs.readFileSync('data/user.json', 'utf8');
        const users = JSON.parse(data);
        const user = users.find(user => user.userId === req.session.userId);
        if(!user) {
            return res.status(404).send('User not found');
        } else {
            const { nickname } = req.body;
            user.nickname = nickname;
            //user.profile_image = profile_image;
            fs.writeFileSync('data/user.json', JSON.stringify(users));
            res.status(200).send(user);
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 회원탈퇴 - DELETE
router.delete('/user', (req, res) => {
    try{
        if(!req.session.userId){
            return res.status(400).send('Session expired');
        }
        const data = fs.readFileSync('data/user.json', 'utf8');
        const users = JSON.parse(data);
        const user = users.find(user => user.userId === req.session.userId);
        if(!user) {
            return res.status(404).send('User not found');
        } else {
            users.splice(users.indexOf(user), 1);
            fs.writeFileSync('data/user.json', JSON.stringify(users))
            .then(()=>{
                // 사용자가 작성한 게시글과 댓글 삭제
                const data2 = fs.readFileSync('data/post.json', 'utf8');
                const posts = JSON.parse(data2);
                const data3 = fs.readFileSync('data/comment.json', 'utf8');
                const comments = JSON.parse(data3);
                posts.forEach(post => {
                    if(post.writer === parseInt(req.session.userId)) {
                        posts.splice(posts.indexOf(post), 1);
                    }
                });
                comments.forEach(comment => {
                    if(comment.writer === parseInt(req.session.userId)) {
                        comments.splice(comments.indexOf(comment), 1);
                    }
                });
                fs.writeFileSync('data/post.json', JSON.stringify(posts));
                fs.writeFileSync('data/comment.json', JSON.stringify(comments));
                req.session.destroy(err => {
                    if(err) {
                        return res.status(500).send('Internal Server Error');
                    }
                });
            });
            res.status(200).send('User deleted');
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 비밀번호 수정 - PATCH
// body - password
router.patch('/user/password', (req, res) => {
    if(!req.session.userId){
        return res.status(400).send('Session expired');
    }
    const data = fs.readFileSync('data/user.json', 'utf8');
    const users = JSON.parse(data);
    const user = users.find(user => user.userId === parseInt(req.session.userId));
    if(!user) {
        return res.status(404).send('User not found');
    } else {
        const { password } = req.body;
        user.password = password;
        fs.writeFileSync('data/user.json', JSON.stringify(users));
        return res.status(200).send("Password changed");
    }
});
*/

module.exports = router;