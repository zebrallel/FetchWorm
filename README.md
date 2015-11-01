# Fetchworm

从天润话务系统抓取企业编号，修改对应模板并上传的一个例子。值得记录的几个地方：

* http请求是无法保持长连接的，唯一的身份标示就是Cookie，所以只要得到了Cookie就可以获取一切信息。当然前提是每次请求不需要重复输入验证码。
* 在和天润系统交互时，一个会话的范围是浏览器。当我第一次登陆成功后，服务器端会保存我这次的用户信息，生成响应Cookie返回，然后这次所有的请求都会在这个账号下。
* Node的request库在请求重定向时并没有重新赋值cookie，所以会导致无法成功登陆，此时我们可以通过重写redirect方法来解决。
* 使用文件上传功能时，注意一定要写对form中的name值。一开始我天真地随便写了个name，没想过最后生成的request会是怎样，结果当然是错的。