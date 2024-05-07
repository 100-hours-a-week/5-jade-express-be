const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bdps = require('body-parser');
const session = require('express-session');

router.use(bdps.urlencoded({extended:true}));
router.use(bdps.json());

router.use(session({
    secure: false, // http 환경에서도 session 정보를 주고받도록 처리
    secret: 'secret key', // session id를 암호화하기 위한 키, 실제 사용시에는 노출되지 않도록 처리해야 함
    resave: false, // session을 언제나 저장할지 설정
    saveUninitialized: true, // 초기화되지 않은 session을 저장
    cookie: {
      httpOnly: true, // 클라이언트에서 쿠키를 확인하지 못하도록 설정
      secure: false
    },
    name: 'session-cookie'
}));

// 세션 코드 -------------------------------------------
// 로그인 세션 생성 - GET
// body - email, password
router.get('/login', (req, res) => {
    try{
        if(req.session.userId){
            res.status(402).send('Already logged in');
        }
        const data = fs.readFileSync('data/user.json');
        const users = JSON.parse(data);
        const { email, password } = req.body;
        const user = users.find(user => user.email === email && user.password === password);
        if(user) {
            req.session.userId = user.userId;
            res.status(200).send('Logged in');
        } else {
            res.status(401).send('Invalid email or password');
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 로그아웃
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if(err) {
            return res.status(500).send('Internal Server Error');
        }
    }
    );
    res.redirect(302, '/');
});
// -----------------------------------------------------

// 게시글 목록 페이지 - GET
router.get('/post', (req, res) => {
    try{
        const data = fs.readFileSync('data/post.json');
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
        const data = fs.readFileSync('data/post.json');
        const posts = JSON.parse(data);
        const post = posts.find(post => post.postId === parseInt(req.params.id));
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
        const data = fs.readFileSync('data/post.json');
        const posts = JSON.parse(data);
        const { title, content, image } = req.body;
        const date = new Date();
        const post = { 
            id: posts.length + 1, 
            writer: req.session.userId, 
            title: title, 
            time: date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds(),
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
        const data = fs.readFileSync('data/post.json');
        const posts = JSON.parse(data);
        const post = posts.find(post => post.postId === parseInt(req.params.postId));
        if(!post) {
            return res.status(500).send("Internal Server Error");
        } else if(post.writer !== req.session.userId) {
            return res.status(400).send('No permission to delete post');
        } else {
            post.title = req.body.title;
            post.content = req.body.content;
            post.image = req.body.image;
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
    const data = fs.readFileSync('data/post.json');
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
router.get('/comment/:postId', (req, res) => {
    const data = fs.readFileSync('data/comment.json');
    const comments = JSON.parse(data);
    const comment = comments.filter(comment => comment.postId === parseInt(req.params.id));
    if(!comment) {
        return res.status(404).send('Post not found');
    }else {
        res.send(comment);
    }
});

// 댓글 작성 - POST
// param - postId
// body - text
router.post('/comment/:postId', (req, res) => {
    try{
        const { text } = req.body;
        const data = fs.readFileSync('data/comment.json');
        const postData = fs.readFileSync('data/post.json');
        const posts = json.parse(postData);
        const post = posts.find(post => post.postId === parseInt(req.params.id));
        const comments = JSON.parse(data);
        const date = new Date();
        const comment = {
            commentId: comments.length + 1,
            postId: parseInt(req.params.id),
            writer: req.session.userId,
            time: date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds(),
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
        const { text } = req.body;
        const data = fs.readFileSync('data/comment.json');
        const comments = JSON.parse(data);
        const comment = comments.find(comment => comment.commentId === parseInt(req.params.commentId));
        if(!comment) {
            return res.status(404).send('Comment not found');
        } else if(comment.writer !== req.session.userId) {
            return res.status(400).send('No permission to edit comment');
        } else {
            comment.text = req.body.text;
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
        const data = fs.readFileSync('data/comment.json');
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

// 프로필 수정 페이지 - GET
router.get('/user', (req, res) => {
    try{
        const data = fs.readFileSync('data/user.json');
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
        const data = fs.readFileSync('data/user.json');
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
// body - email, nickname, profile_image
router.patch('/user', (req, res) => {
    try{
        const data = fs.readFileSync('data/user.json');
        const users = JSON.parse(data);
        const user = users.find(user => user.userId === req.session.userId);
        if(!user) {
            return res.status(404).send('User not found');
        } else {
            const { email, nickname, profile_image } = req.body;
            user.email = email;
            user.nickname = nickname;
            user.profile_image = profile_image;
            fs.writeFileSync('data/user.json', JSON.stringify(users));
            res.send(user);
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }
});

// 회원탈퇴 - DELETE
router.delete('/user', (req, res) => {
    try{
        const data = fs.readFileSync('data/user.json');
        const users = JSON.parse(data);
        const user = users.find(user => user.userId === req.session.userId);
        if(!user) {
            return res.status(404).send('User not found');
        } else {
            users.splice(users.indexOf(user), 1);
            fs.writeFileSync('data/user.json', JSON.stringify(users))
            .then(()=>{
                // 사용자가 작성한 게시글과 댓글 삭제
                const data2 = fs.readFileSync('data/post.json');
                const posts = JSON.parse(data2);
                const data3 = fs.readFileSync('data/comment.json');
                const comments = JSON.parse(data3);
                posts.forEach(post => {
                    if(post.writer === req.session.userId) {
                        posts.splice(posts.indexOf(post), 1);
                    }
                });
                comments.forEach(comment => {
                    if(comment.writer === req.session.userId) {
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
router.PATCH('/user/password', (req, res) => {

    const data = fs.readFileSync('data/user.json');
    const users = JSON.parse(data);
    const user = users.find(user => user.userId === req.session.userId);
    if(!user) {
        return res.status(404).send('User not found');
    } else {
        const { password } = req.body;
        user.password = password;
        fs.writeFileSync('data/user.json', JSON.stringify(users));
        return res.status(200).send("Password changed");
    }
});

module.exports = router;