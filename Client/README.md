# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## 웹페이지에서 에드센스 광고 넣는 방법
import AdSenseBanner from '../components/AdSenseBanner';

function FortuneLunchPage() {
  return (
    <div>
      <h1>오늘의 운세 점심 추천</h1>

      {/* 광고가 들어갈 자리에 컴포넌트만 배치하면 끝! */}
      <AdSenseBanner />

      <main>
        {/* 기존 운세 콘텐츠 로직 */}
      </main>

      <AdSenseBanner />
    </div>
  );
}