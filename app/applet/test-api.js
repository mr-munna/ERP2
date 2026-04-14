import http from 'http';

const data = JSON.stringify({
  name: "Test Product",
  barcode: "",
  category: "Tiles",
  brand: "",
  size: "",
  grade: "",
  quantity_box: 0,
  pcs_per_box: 1,
  sft_per_pc: 0,
  warehouse_location: ""
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(`Status: ${res.statusCode}\nBody: ${body}`));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
