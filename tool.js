var request = require('request');
var cheerio = require('cheerio');
var stream = require('stream');
var fs = require('fs');

var FETCH_NUM = 10;    //max 1562

var index = 0,
	hotlineNums = [];

// enterance
(function(){
	hotlineNums = getHotlineNumList('./file/all.txt');

	doFetch();
})();

function getHotlineNumList(filePath){
	var file = fs.readFileSync(filePath,'utf8');
	var hotLines = file.split('\n');

	return hotLines;
}

function getHeaders(options){
	return {
		'Host': options.host,
		'Connection': 'keep-alive',
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
		'Accept-Encoding': 'gzip, deflate',
		'Cookie': options.cookie
	}
}

function doFetch(){
	if(index >= FETCH_NUM){
		return;
	}

	var str = hotlineNums[index];
	if(!str || str.length == 0){
		return;
	}

	var hostline = str.split('-')
	index++;

	request({
		url : 'http://192.168.100.43/app/cs/loginCcic.jsp?hotline=' + hostline[0] + '&ccicId='+hostline[1],
		headers : getHeaders({
			host : '192.168.100.43',
			cookie : 'jboss_login_username_cookie=xuejian.xu; jboss_login_user_cookie_id=1446125031858_xuejian.xu-670448891; JSESSIONID=538C69059FC4119BE3B259A0CD0AA3B2'
		})
	},function(err,resp,body){
		var $ = cheerio.load(body);
		var span = $("li:contains('企业编号')").find('span').last().text();
		var firmId = span.substring(1,span.length-1);    //企业编号

		console.log('企业编号：'+firmId);

		var host = resp.request.uri.host;
		var cookie = resp.request.headers.Cookie;

		request({
			url : 'http://'+host+'/ivrProfile!list.action?limit=50&pageSize=50',
			headers : getHeaders({
				host : host,
				cookie : cookie
			})
		},function(err,resp,body){
			var $ = cheerio.load(body);
			var href = $('a:contains("退款授权")').attr('href');
			if(!href || href.length == 0){
				console.log('退款授权文件不存在！');
				var log = 'hotLine:' + hostline[0] + ' -- 企业编号:' + firmId + '      授权文件不存在!'
				fs.writeFileSync('./logs/record.log',log);

				doFetch();
			}else{
				var id = href.split('=')[1];
				console.log('匹配授权文件成功，文件id：' + id);

				request({
					url : 'http://'+host+'/ivrProfile!delete.action?id=' + id,
					headers : getHeaders({
						hsot : host,
						cookie : cookie
					})
				},function(err,resp,body){
					if(body && body.length > 0){
						console.log('文件删除成功！开始替换本地模板...');

						var file = fs.readFileSync('./file/退款授权.txt','utf8');
						var modifiedFile = file.replace('*******',firmId);
						fs.writeFileSync('./file/退款授权-upload.txt',modifiedFile);

						var fileStream = fs.createReadStream('./file/退款授权-upload.txt');
						console.log('修改成功，开始上传文件...');

						request({
							url : 'http://'+host+'/ivrProfile!importIvr.action',
							method : 'POST',
							formData : {
								file : fileStream
							},
							headers : getHeaders({
								host : host,
								cookie : cookie
							})
						},function(){
							if(body && body.length > 0){
								var log = 'hotLine:' + hostline[0] + ' -- 企业编号:' + firmId + '      success!'
								fs.appendFileSync('./logs/record.log',log);
								console.log('上传成功！');

								doFetch();
							}
						});
					}
				});
			}
		});
	});
}





