import { Router } from 'express';
import { 
    createProduct, 
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    toggleFavorite,
    getFavoriteProducts,
    uploadProductImage,
    uploadProductImageAndSaveDB

} from './product.controller.js';
import { authRequired } from './middleware/auth.middleware.js'; 
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Rutas públicas: cualquiera puede ver los productos
router.get('/products', getProducts); 
// Obtener un producto por ID
router.get('/products/:id', getProductById);

// Rutas protegidas: requiere autenticación para publicar, editar, o eliminar
router.post('/products', authRequired, createProduct);
// Editar un producto (solo el dueño)
router.put('/products/:id', authRequired, updateProduct);
// Ruta protegida para la eliminación
router.delete('/products/:id', authRequired, deleteProduct);
// Usamos POST para el "toggle" ya que crea/elimina un estado
router.post('/products/:id/favorite', authRequired, toggleFavorite);
// GET para obtener la lista de productos favoritos del usuario logueado
router.get('/favorites', authRequired, getFavoriteProducts);

// Upload de imagen: requiere auth, usa multer en memoria (sin guardar en BD)
router.post('/upload/image', authRequired, upload.single('image'), uploadProductImage);

// Upload de imagen con guardado en product_images: requiere auth + productId en body
router.post('/upload/image-db', authRequired, upload.single('image'), uploadProductImageAndSaveDB);

export default router;