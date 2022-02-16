import './App.css';
import { Helmet } from '@modern-js/runtime/head';
import TypeSelector from './components/TypeSelector';
import Menu from './components/Menu';

const App = () => (
  <div className="container">
    <Helmet>
      <title>首页</title>
    </Helmet>
    <div className="contentWrapper">
      <Menu />
      <TypeSelector />
    </div>
  </div>
);

export default App;
