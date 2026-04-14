import fetch from 'node-fetch';

async function test() {
  const smsUrl = new URL('https://www.netsmsbd.com/api');
  smsUrl.searchParams.append('username', 'test');
  smsUrl.searchParams.append('password', 'test');
  smsUrl.searchParams.append('number', '8801711111111');
  smsUrl.searchParams.append('message', 'test');

  const res = await fetch(smsUrl.toString());
  const text = await res.text();
  console.log('GET', text);
}

test();
