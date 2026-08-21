import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/shop" element={<Home />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/cart"
              element={<ProtectedRoute><Cart /></ProtectedRoute>}
            />
            <Route
              path="/checkout/:orderId"
              element={<ProtectedRoute><Checkout /></ProtectedRoute>}
            />
            <Route
              path="/orders"
              element={<ProtectedRoute><Orders /></ProtectedRoute>}
            />
            <Route
              path="/admin"
              element={<ProtectedRoute><Admin /></ProtectedRoute>}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}