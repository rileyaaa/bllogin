const fs = require('fs');
const puppeteer = require('puppeteer');

function formatToISO(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

async function delayTime(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  // 读取 accounts.json 中的 JSON 字符串
  const accountsJson = fs.readFileSync('accounts.json', 'utf-8');
  const accounts = JSON.parse(accountsJson);
  console.log(`读取到 ${accounts.length} 个账号信息。`);

  for (const account of accounts) {
    const { username, password, panelnum } = account;
    console.log(`正在处理账号: ${username}, panelnum: ${panelnum}`);
    console.log(`输入的密码: ${password}`); // 输出密码

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let url = `https://panel${panelnum}.serv00.com/login/?next=/`;
    console.log(`尝试访问 URL: ${url}`);

    try {
      // 修改网址为新的登录页面
      await page.goto(url);
      console.log(`成功访问 URL: ${url}`);

      // 清空用户名输入框的原有值
      const usernameInput = await page.$('#id_username');
      if (usernameInput) {
        console.log(`找到用户名输入框，准备输入用户名: ${username}`);
        await usernameInput.click({ clickCount: 3 }); // 选中输入框的内容
        await usernameInput.press('Backspace'); // 删除原来的值
      } else {
        throw new Error('无法找到用户名输入框');
      }

      // 输入实际的账号和密码
      await page.type('#id_username', username);
      await page.type('#id_password', password);
      console.log(`输入用户名和密码完成`);

      // 提交登录表单
      const loginButton = await page.$('#submit');
      if (loginButton) {
        console.log('找到登录按钮，尝试登录...');
        await loginButton.click();
      } else {
        throw new Error('无法找到登录按钮');
      }

      // 等待登录成功（如果有跳转页面的话）
      await page.waitForNavigation();
      console.log('页面导航完成，检查登录状态...');

      // 判断是否登录成功
      const isLoggedIn = await page.evaluate(() => {
        const logoutButton = document.querySelector('a[href="/logout/"]');
        return logoutButton !== null;
      });

      if (isLoggedIn) {
        // 获取当前的UTC时间和北京时间
        const nowUtc = formatToISO(new Date());// UTC时间
        const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000)); // 北京时间东8区，用算术来搞
        console.log(`账号 ${username} 于北京时间 ${nowBeijing}（UTC时间 ${nowUtc}）登录成功！`);
      } else {
        console.error(`账号 ${username} 登录失败，请检查账号和密码是否正确。`);
      }
    } catch (error) {
      console.error(`账号 ${username} 登录时出现错误: ${error}`);
    } finally {
      // 关闭页面和浏览器
      await page.close();
      await browser.close();
      console.log(`浏览器已关闭，准备处理下一个账号。`);

      // 用户之间添加随机延时
      const delay = Math.floor(Math.random() * 8000) + 1000; // 随机延时1秒到8秒之间
      console.log(`等待 ${delay} 毫秒后处理下一个账号。`);
      await delayTime(delay);
    }
  }

  console.log('所有账号登录完成！');
})();
