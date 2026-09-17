import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import CrearEvento from './pages/CrearEvento';
import DetalleEvento from './pages/DetalleEvento';
import Hoy from './pages/Hoy';
import Progreso from './pages/Progreso';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/hoy" replace />} />
        <Route path="/hoy" element={<Hoy />} />
        <Route path="/crear" element={<CrearEvento />} />
        <Route path="/evento/:id" element={<DetalleEvento />} />
        <Route path="/progreso" element={<Progreso />} />
      </Routes>
    </Router>
  );
}

export default App;