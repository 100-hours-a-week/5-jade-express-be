#workflow-be
1. backend router => routes/index.js
2. backend->local file post => routes/index.js
3. user session - express-session => routes/index.js

#workflow-fe
1. frontend->backend fetch module => public/js/fileFetch.js
2. static file add views-html, public-css, images, js -done
3. static file edit-path -done
4. client js file edit-path, fetch module -done
5. post.js, html improve - done
6. get backend->frontend response data

#todos
1. test session - 나중으로 미루기
라우터 모듈에서도 세션이 제대로 동작할까?
하지 않는다면 router 모듈을 삭제하고 app.js로 통합할 필요가 있음
2. test fetch module
3. test static routing
4. test dynamic routing
5. test file I/O
6. test demands
7. improve sites
8. edit password line 17(다른 파일들 헤더도 동일) header image src 변경 필요 -done
9. 

#changes
1. post.json id=>postId (key 변경)
2. session 추가
<https://inpa.tistory.com/entry/EXPRESS-%F0%9F%93%9A-express-session-%EB%AF%B8%EB%93%A4%EC%9B%A8%EC%96%B4">
참고 블로그가 안들어가져서 구글 검색 링크 - Inpa Dev
<https://www.google.com/search?q=express+req.session&oq=express+req.se&gs_lcrp=EgZjaHJvbWUqBwgAEAAYgAQyBwgAEAAYgAQyBggBEEUYOTIHCAIQABiABDIHCAMQABiABDIHCAQQABiABDIHCAUQABiABDIICAYQABgWGB4yCAgHEAAYFhgeMggICBAAGBYYHjIICAkQABgWGB6oAgCwAgA&sourceid=chrome&ie=UTF-8>
3. fs module 추가
<Node.js의 fs 모듈로 파일 입출력 처리하기>
<https://www.daleseo.com/js-node-fs/>
4. router module 분리
5. comment.json commentId 후 postId 순서로 변경
6. 백엔드 method get/post/patch/delete 로 변경
7. PORT, SECRET .env 추가


#고려중
1. json writer => userId
2. edit method to patch for RESTful - done
3. image get / upload
4. session store
5. how to split fe-be
이거 ㄹㅇ 어케함
be 서버에서는 REST API만 (데이터 CRUD) - done
fe 서버에서는 html, css, js (정적 파일) 제공 - done
be에서 REST API로 데이터 받아오기 - WIP
--포트 분리(be-8080 / fe-3030) - done
--경로는 자동으로 분리됨, session을 어떻게 할지 생각
--ㄴsession storage 도입 필요
6. path optimization - fe
<https://moonheekim-code.tistory.com/97>

#referrence
1. body-parser
<https://velog.io/@goody/NodeJs-Express-%EB%A1%9C-%EC%9B%B9%EC%84%9C%EB%B2%84-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0-2%ED%83%84>
2. fetch-POST-request
<https://velog.io/@seoltang/fetch-POST-Request>
3. kakao-cloud 강의 일정
<https://edu.startupcode.kr/aba0a98c-457a-4473-ab57-db9663e97ef2>