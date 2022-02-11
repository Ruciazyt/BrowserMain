import './App.css';
import { Helmet } from '@modern-js/runtime/head';
import TypeSelector from './components/TypeSelector';

const App = () => (
  <div className="container">
    <Helmet>
      <title>首页</title>
    </Helmet>
    <div className="contentWrapper">
      <div className="searchBar">
        <form
          action="https://www.baidu.com/s"
          method="GET"
          target="_blank"
          className="inputForm">
          <div className="queryTypeSelector">
            <TypeSelector />
          </div>
          <input
            type="text"
            name="wd"
            id="kw"
            className="queryBar"
            autoComplete="off"></input>
          <input type="submit" value=" " className="queryButton"></input>
        </form>
      </div>
    </div>
  </div>
);

export default App;
