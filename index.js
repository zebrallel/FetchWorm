var request = require('request');
var cheerio = require('cheerio');
var stream = require('stream');
var fs = require('fs');

var ns = [1,3,4,5,6,7,14,10,11,12,13];  //10
var n = ns[10];

var options = {
  url: 'http://192.168.100.43/enterprise!searchList.action?selectCcicId='+n+'&agentId=10&type=2&limit=500&query=查询',
  //url : 'http://192.168.100.43/app/cs/loginCcic.jsp?hotline=89677086&ccicId=1',
  headers: {
    'Host': '192.168.100.43',
	'Connection': 'keep-alive',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Encoding': 'gzip, deflate',
	'User-Agent':' Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36',
	'Referer': 'http://192.168.100.43/enterprise!searchList.action',
	'Cookie': 'JSESSIONID=90B32E3C190F649CB6D7DFF2962D8654; jboss_login_username_cookie=xuejian.xu; jboss_login_user_cookie_id=1446125031858_xuejian.xu-670448891'
	}
};

// request(options,function(err,resp,body){
// 		var $ = cheerio.load(body);
// 	  	var tds = $("td:contains('国内机票')");
// 	 	var nums = [];
// 	 	tds.each(function(idx,el){
// 	 		var num = $(el).prev().text();
// 	 		if(num.length == 8){
// 	 			nums.push(num);
// 	 			fs.appendFileSync('./file/all.txt',num+'-'+n+'\n');
// 	 		}
// 	 	});

// 	 	console.log(nums.length + ' done!');
// 	});

//readFiles();

var index = 0;
var nums = ['89677086-1'];
function readFiles(){
	fs.readFile('./file/all.txt','utf8',function(err,file){
		nums = file.split('\n');
		doReq();
	});
}

function doReq(){
	if(index >= 1562){
		return;
	}else{
		console.log('\n编号'+index+'开始-----------');
		var s = nums[index++];
		var ss = s.split('-');
		console.dir(ss);
		request({
			url : 'http://192.168.100.43/app/cs/loginCcic.jsp?hotline=' + ss[0] + '&ccicId='+ss[1],
			//url : 'http://192.168.100.43/app/cs/loginCcic.jsp?hotline=89677086&ccicId=1',
			headers : {
				'Host': '192.168.100.43',
				'Connection': 'keep-alive',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
				'Accept-Encoding': 'gzip, deflate',
				'Cookie': 'JSESSIONID=7E8F0D8C1D2BB200B7DB4ED538D7212C; jboss_login_username_cookie=xuejian.xu; jboss_login_user_cookie_id=1446125031858_xuejian.xu-670448891'
			}
		},function(err,resp,body){
			var $ = cheerio.load(body);
			var span = $("li:contains('企业编号')").find('span').last();
			var str = span.text();
			//企业编号
			var firmId = str.substring(1,str.length-1);
			console.log('企业编号：'+firmId);
			var host = resp.request.uri.host;
			// fs.appendFileSync('./file/result.txt',strSub+'-'+host+'\n');
			// console.log(index + '  done! '+strSub+'-'+host);

			var setCookie = resp.request.headers.Cookie;
		    console.log(setCookie+'---'+host);

			request({
				url : 'http://'+host+'/ivrProfile!list.action',
				headers : {
					'Host': host,
					'Connection': 'keep-alive',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
					'Accept-Encoding': 'gzip, deflate',
					'Cookie': setCookie
				},
			},function(err,resp,body){
				var $ = cheerio.load(body);
				var href = $('a:contains("退款授权")').attr('href');
				if(!href){
					console.log('退款授权文件不存在！');
					doReq();
				}
				var id = href.split('=')[1];
				console.log('匹配授权文件成功，文件id：' + id);

				request({
					url : 'http://'+host+'/ivrProfile!delete.action?id=' + id,
					headers : {
						'Host': host,
						'Connection': 'keep-alive',
						'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
						'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
						'Accept-Encoding': 'gzip, deflate',
						'Cookie': setCookie
					}
				},function(err,resp,body){
					if(body){
						console.log('删除成功！');
						console.log('开始修改文件...');
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
							headers : {
								'Host': host,
								'Connection': 'keep-alive',
								'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
								'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
								'Accept-Encoding': 'gzip, deflate',
								'Cookie': setCookie
							}
						},function(err,resp,body){
							var log = 'hotLine:' + ss[0] + ' -- 企业编号:' + firmId + '      success!'
							fs.writeFileSync('./logs/record.log',log);
							console.log('上传成功！');
						});
					}else{
						console.log('删除失败！');
					}
				});
			});
			//doReq();
		});
	}
}

// request({
// 	url : 'http://192.168.128.65/ivrProfile!list.action',
// 	headers : {
// 		'Host': '192.168.128.65',
// 		'Connection': 'keep-alive',
// 		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
// 		'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
// 		'Accept-Encoding': 'gzip, deflate',
// 		'Cookie': 'JSESSIONID=39BD6CE74BCE37142539E1E46253B597'
// 	}
// },function(err,resp,body){
// 	console.log(body);
// 	var $ = cheerio.load(body);
// 	var href = $('a:contains("退款授权")').attr('href');
// 	console.log(href);
// });


//var file = fs.readFileSync('./file/退款授权.txt','utf8');
// for(var i in lines){
// 	var str = lines[i];
// 	if(/0001/.test(str)){
// 		var result = file.replace(str.substring(1,8),'*******');
// 		console.log(result);
// 	}
// }
//fs.writeFileSync('./file/退款授权-upload.txt',file.replace('*******','ggggggg'));
//var file = fs.readFileSync('./file/退款授权.txt');
// var host = '192.168.128.65';
// //var host = '127.0.0.1:8888';

// var sss = new stream.Readable();
// sss._read = function noop() {}; // redundant? see update below
// sss.push(file);


// request({
// 	url : 'http://'+host+'/ivrProfile!importIvr.action',
// 	method : 'POST',
// 	formData : {
// 		file : sss
// 	},
// 	headers : {
// 		'Host': host,
// 		'Connection': 'keep-alive',
// 		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
// 		'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
// 		'Accept-Encoding': 'gzip, deflate',
// 		'Cookie': 'JSESSIONID=39BD6CE74BCE37142539E1E46253B597'
// 	}
// },function(err,resp,body){
// 	// var $ = cheerio.load(body);
// 	// var href = $('a:contains("退款授权")').attr('href');
// 	console.log(resp.request.headers);
// });

