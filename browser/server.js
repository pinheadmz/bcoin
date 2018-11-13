'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const WSProxy = require('./wsproxy');
const Validator = require('bval');

const index = fs.readFileSync(`${__dirname}/index.html`);
const browsernode = fs.readFileSync(`${__dirname}/browsernode.html`);

const proxy = new WSProxy({
  ports: [8333, 18333, 18444, 28333, 28901]
});

const server = bweb.server({
  host: '0.0.0.0',
  port: 8080,
  sockets: false
});

server.use(server.router());

proxy.on('error', (err) => {
  console.error(err.stack);
});

server.on('error', (err) => {
  console.error(err.stack);
});

server.get('/', (req, res) => {
  res.send(200, index, 'html');
});

server.get('/:dir/index.html', (req, res) => {
  res.send(200, browsernode, 'html');
});

server.get('/:dir/app.js', (req, res) => {
  const valid = Validator.fromRequest(req);
  const dir = valid.str('dir');
  res.send(200, getFile(dir, 'app.js'), 'js');
});

server.get('/:dir/worker.js', (req, res) => {
  const valid = Validator.fromRequest(req);
  const dir = valid.str('dir');
  res.send(200, getFile(dir, 'worker.js'), 'js');
});

proxy.attach(server.http);

server.open();

function getFile(dir, file){
	return fs.readFileSync(`${__dirname}/${dir}/${file}`)
}