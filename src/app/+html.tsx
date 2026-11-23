import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Root HTML for the static web export. Runs only in Node during rendering: no window/document here.
// The service worker is registered only in production builds: in dev it would cache Metro bundles.
const isProduction = process.env.NODE_ENV === 'production';
const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (err) {
      console.warn('Service worker registration failed', err);
    });
  });
}`;

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return (
    <html lang="pt-BR" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Finanças</title>
        <meta name="description" content="Controle financeiro da sua casa" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F4F5F2" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#101413" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Finanças" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {isProduction && <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />}
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
