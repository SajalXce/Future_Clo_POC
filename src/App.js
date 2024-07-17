import logo from './logo.svg';
import './App.css';
// import SnapCamera from './pages/SnapCamera/SnapCamera';
import CombinedComponent from './pages/SnapCamera/combined';
// import GestureRecognitionComponent from './pages/SnapCamera/Gesture';
function App() {
  return (
   
    <div className="layout">
  {/* <SnapCamera/> */}
    {/* <GestureRecognitionComponent/> */}
    <CombinedComponent/>
  </div>
  );
}

export default App;
