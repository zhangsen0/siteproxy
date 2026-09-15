/**
 * 自定义 Worker 入口（包装层）。
 *
 * 职责：
 * 1. 访问代理根路径（即 token_prefix，如 /Kp7m2Xq9/）时，
 *    直接返回项目内自带的首页（homepage/index.html），
 *    不再请求外部网站；
 * 2. 其余所有请求原样转发给 siteproxy 原始 Worker（build/worker.js）。
 *
 * 如何自定义：
 * - 导航站点、页面标题、搜索引擎 -> 编辑 homepage/config.json
 * - 页面外观（结构/样式）       -> 编辑 homepage/index.html
 * - 代理域名 / 访问密码         -> 编辑 wrangler.worker.jsonc 的 vars
 *
 * 本文件无需改动。提交代码后 GitHub Actions 会自动部署。
 */
import homepageHtml from './homepage/index.html';
import homepageConfig from './homepage/config.json';
import siteproxy from './build/worker.js';

function normalizePrefix(prefix) {
  let p = prefix || '/';
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\/?$/, '/');
}

function renderHomepage(env) {
  const prefix = normalizePrefix(env && env.token_prefix);
  const pageConfig = {
    ...homepageConfig,
    proxyPrefix: prefix,
    proxyHost: (env && env.proxy_url) || '',
  };
  const json = JSON.stringify(pageConfig).replace(/</g, '\\u003c');
  return homepageHtml
    .replace('__PAGE_CONFIG__', () => json)
    .replace('__PROXY_PREFIX__', () => prefix);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const prefix = normalizePrefix(env && env.token_prefix);
    // 命中代理根路径（带或不带末尾斜杠）时返回内置首页
    if (url.pathname === prefix || url.pathname === prefix.slice(0, -1)) {
      return new Response(renderHomepage(env), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }
    // 其余请求交给 siteproxy
    return siteproxy.fetch(request, env, ctx);
  },
};
