import { supabase } from './db.js';

// Tipos permitidos para el campo "type" en products
const ALLOWED_TYPES = ['producto', 'venta', 'renta', 'donacion', 'intercambio'];
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'product-images';
const BANNED_KEYWORDS = ['arma', 'drogas', 'explosivo', 'pornografía','pistola']; // personaliza

const contieneProhibido = (texto = '') => {
  const t = texto.toLowerCase();
  return BANNED_KEYWORDS.some((palabra) => t.includes(palabra.toLowerCase()));
};
// Crea el bucket si no existe (usa service role)
const ensureBucketExists = async () => {
    const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);

    if (data) return true; // ya existe

    if (error) {
        const notFound = error.status === 404 || error.statusCode === '404' || /not\s*found/i.test(error.message || '');
        if (!notFound) throw error;

        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        // Si ya existe, ignoramos; si es otro error lo propagamos
        if (createError && !/exists/i.test(createError.message || '')) throw createError;
        return true;
    }

    return true;
};

// Helper: valida y normaliza URLs de imagen
const normalizeImageUrls = (imageUrls = []) => {
    if (!Array.isArray(imageUrls)) return { valid: [], invalid: [] };
    const trimmed = imageUrls.map(u => (u || '').trim()).filter(Boolean);
    const invalid = trimmed.filter(url => !/^https?:\/\//i.test(url));
    const valid = trimmed.filter(url => /^https?:\/\//i.test(url));
    return { valid, invalid };
};

// --- C R E A T E (Crear Producto) ---
export const createProduct = async (req, res) => {
    const { name, description, price, category, location, imageUrls, type, state, latitude, longitude } = req.body;
        const { size, material, contactInfo } = req.body; // Added new fields
    const userId = req.userId;

  if (!userId || !name || !price) {
    return res
      .status(400)
      .json({ message: 'Faltan campos obligatorios (Usuario, Nombre, Precio).' });
  }
  if (contieneProhibido(name) || contieneProhibido(description)) {
    return res.status(400).json({
        message: 'El producto contiene palabras o servicios prohibidos.',
        });
    }

    const normalizedType = (type || 'producto').toString().trim().toLowerCase();
    const finalType = ALLOWED_TYPES.includes(normalizedType) ? normalizedType : 'producto';
    const finalState = (state || 'visible').toString().trim().toLowerCase();

    const { valid: validUrls, invalid: invalidUrls } = normalizeImageUrls(imageUrls);
    if (invalidUrls.length > 0) {
        return res.status(400).json({ message: 'Algunas URLs no son válidas. Deben comenzar con http:// o https://', invalidUrls });
    }

    try {
        const { data: inserted, error: insertError } = await supabase
            .from('products')
            .insert([{
                user_id: userId,
                name,
                description,
                price,
                category,
                location,
                    size, // Added new field
                    material, // Added new field
                    contact_info: contactInfo, // Added new field
                    latitude,
                    longitude,
                type: finalType,
                state: finalState
            }])
            .select('id')
            .single();

        if (insertError) throw insertError;

        const productId = inserted.id;

        if (validUrls.length > 0) {
            const imageRows = validUrls.map(url => ({ product_id: productId, image_url: url }));
            const { error: imgError } = await supabase.from('product_images').insert(imageRows);
            if (imgError) throw imgError;
        }

        const { data: created, error: fetchError } = await supabase
            .from('products')
                .select('id, name, description, price, category, location, size, material, contact_info, latitude, longitude, type, state, created_at, user_id, product_images(image_url)') // Updated select statement
            .eq('id', productId)
            .single();

        if (fetchError) throw fetchError;

        // Transformar product_images de [{image_url: 'url'}] a ['url']
        const productWithImages = {
            ...created,
            images: created.product_images?.map(img => img.image_url) || []
        };
        delete productWithImages.product_images;

        res.status(201).json({ message: 'Producto publicado con éxito', product: productWithImages });
    } catch (error) {
        console.error('Error al crear el producto:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear el producto.', error: error.message });
    }
};

// --- R E A D (Obtener productos con filtros) ---
export const getProducts = async (req, res) => {
  const { category, location, min_price, max_price, search, latitude, longitude, radius } = req.query;

  try {
        let query = supabase
            .from('products')
            .select('id, name, description, price, category, location, size, material, contact_info, latitude, longitude, type, state, created_at, user_id, product_images(image_url)')
            .eq('state', 'visible')
            .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (location) query = query.ilike('location', `%${location}%`);
    if (min_price) query = query.gte('price', min_price);
    if (max_price) query = query.lte('price', max_price);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    console.log('[DEBUG] Productos raw de Supabase count:', data?.length || 0);

    // Transformar cada producto: product_images -> images
    let productsWithImages = (data || []).map(p => ({
      ...p,
      images: p.product_images?.map(img => img.image_url) || []
    }));
    // Eliminar la propiedad product_images anidada
    productsWithImages.forEach(p => delete p.product_images);

    // Filtrado por proximidad geográfica si se proporciona
    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius) || 10;

      // Función para calcular distancia Haversine entre dos coordenadas (en km)
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // Filtrar productos dentro del radio especificado
      productsWithImages = productsWithImages.filter(product => {
        if (!product.latitude || !product.longitude) return false; // excluir sin coordenadas
        const distance = calculateDistance(lat, lng, product.latitude, product.longitude);
        return distance <= radiusKm;
      });

      // Ordenar por distancia (más cercanos primero)
      productsWithImages.sort((a, b) => {
        const distA = calculateDistance(lat, lng, a.latitude, a.longitude);
        const distB = calculateDistance(lat, lng, b.latitude, b.longitude);
        return distA - distB;
      });

      console.log('[DEBUG] Filtrado por proximidad: radio=' + radiusKm + 'km, encontrados=' + productsWithImages.length);
    }

    console.log('[DEBUG] Productos transformados:', JSON.stringify(productsWithImages?.[0], null, 2));

    res.status(200).json(productsWithImages);
  } catch (error) {
    console.error('Error al obtener productos con filtros:', error);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
};

// --- R E A D (Obtener UN Producto por ID - Público) ---
export const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, description, price, category, location, size, material, contact_info, latitude, longitude, type, state, created_at, user_id, product_images(image_url)')
            .eq('id', id)
            .eq('state', 'visible')
            .single();

        if (error && error.code === 'PGRST116') {
            return res.status(404).json({ message: 'Producto no encontrado o no está visible.' });
        }
        if (error) throw error;

        // Transformar product_images a images
        const productWithImages = {
            ...data,
            images: data.product_images?.map(img => img.image_url) || []
        };
        delete productWithImages.product_images;

        res.status(200).json(productWithImages);
    } catch (error) {
        console.error('Error al obtener producto por ID:', error);
        res.status(500).json({ message: 'Error al obtener el producto.' });
    }
};

// --- U P D A T E (Actualizar Producto - Vendedor) ---
export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const { name, description, price, category, location, availability, size, material, contactInfo, type, state, imageUrls, latitude, longitude } = req.body;

    if (!name || !price) {
        return res.status(400).json({ message: 'Nombre y Precio son obligatorios.' });
    }

    const normalizedType = (type || 'producto').toString().trim().toLowerCase();
    const finalType = ALLOWED_TYPES.includes(normalizedType) ? normalizedType : 'producto';

    const { valid: validUrls, invalid: invalidUrls } = normalizeImageUrls(imageUrls);
    if (invalidUrls.length > 0) {
        return res.status(400).json({ message: 'Algunas URLs no son válidas. Deben comenzar con http:// o https://', invalidUrls });
    }

    try {
        const { data: updated, error: updateError } = await supabase
            .from('products')
            .update({
                name,
                description,
                price,
                category,
                location,
                availability,
                size,
                material,
                contact_info: contactInfo,
                latitude,
                longitude,
                type: finalType,
                state: state || 'visible'
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select('id')
            .single();

        if (updateError && updateError.code === 'PGRST116') {
            return res.status(404).json({ message: 'Producto no encontrado o no autorizado para editar.' });
        }
        if (updateError) throw updateError;

        // Actualizar imágenes
        if (imageUrls) {
            const { error: delError } = await supabase.from('product_images').delete().eq('product_id', id);
            if (delError) throw delError;

            if (validUrls.length > 0) {
                const rows = validUrls.map(url => ({ product_id: id, image_url: url }));
                const { error: imgError } = await supabase.from('product_images').insert(rows);
                if (imgError) throw imgError;
            }
        }

        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('id, name, description, price, category, location, size, material, contact_info, latitude, longitude, type, state, created_at, user_id, product_images(image_url)')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Transformar product_images a images
        const productWithImages = {
            ...product,
            images: product.product_images?.map(img => img.image_url) || []
        };
        delete productWithImages.product_images;

        res.status(200).json(productWithImages);
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el producto.', error: error.message });
    }
};

// --- D E L E T E (Eliminar Producto) ---
export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

  if (!id) {
    return res.status(400).json({ message: 'Se requiere el ID del producto.' });
  }

    try {
        const { data, error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)
            .select('id')
            .single();

        if (error && error.code === 'PGRST116') {
            return res.status(404).json({ message: 'Producto no encontrado o no autorizado para eliminar.' });
        }
        if (error) throw error;

        res.status(200).json({ message: `Producto con ID ${data.id} eliminado con éxito.` });
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el producto.', error: error.message });
    }
};

// --- T O G G L E  F A V O R I T O ---
export const toggleFavorite = async (req, res) => {
  const { id } = req.params; // product_id
  const userId = req.userId;

  try {
        const { error: insertError } = await supabase
            .from('favorites')
            .insert([{ user_id: userId, product_id: id }]);

        if (!insertError) {
            return res.status(201).json({ message: 'Producto añadido a favoritos.' });
        }

        // Si hay conflicto de unicidad, lo interpretamos como toggle: eliminar
        if (insertError.code === '23505') {
            const { error: deleteError } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', id);

            if (deleteError) throw deleteError;
            return res.status(200).json({ message: 'Producto eliminado de favoritos.' });
        }

        throw insertError;
  } catch (error) {
    console.error('Error en toggleFavorite:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// --- Obtener Productos Favoritos ---
export const getFavoriteProducts = async (req, res) => {
  const userId = req.userId;

  try {
        const { data: favs, error: favError } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', userId);

        if (favError) throw favError;
        if (!favs || favs.length === 0) return res.status(200).json([]);

        const productIds = favs.map(f => f.product_id);

        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, description, price, category, location, type, state, created_at, user_id, product_images(image_url)')
            .in('id', productIds)
            .eq('state', 'visible');

        if (prodError) throw prodError;

        // Transformar product_images a images
        const productsWithImages = (products || []).map(p => ({
            ...p,
            images: p.product_images?.map(img => img.image_url) || []
        }));
        productsWithImages.forEach(p => delete p.product_images);

        res.status(200).json(productsWithImages);
    
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    res.status(500).json({ message: 'Error al obtener favoritos.' });
  }
};

// --- Upload de imagen a Supabase Storage (sin guardar en BD) ---
export const uploadProductImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió ningún archivo.' });
        }

        const userId = req.userId || 'anon';
        const ext = req.file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = `products/${userId}/${fileName}`;

        // Garantiza que el bucket exista (lo crea como público si falta)
        await ensureBucketExists();

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, req.file.buffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: req.file.mimetype || 'application/octet-stream'
            });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return res.status(200).json({ url: publicData.publicUrl, path: filePath });
    } catch (error) {
        console.error('Error al subir imagen:', error);
        const status = error.status || error.statusCode || 500;
        const msg = error.message || 'Error desconocido al subir imagen.';
        return res.status(500).json({
            message: 'Error al subir imagen.',
            error: msg,
            bucket: BUCKET_NAME,
            status
        });
    }
};

// --- Upload de imagen a Supabase Storage Y guardar en product_images ---
export const uploadProductImageAndSaveDB = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió ningún archivo.' });
        }

        const { productId } = req.body;
        const userId = req.userId || 'anon';

        if (!productId) {
            return res.status(400).json({ message: 'productId es requerido.' });
        }

        const ext = req.file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = `products/${userId}/${fileName}`;

        // Garantiza que el bucket exista
        await ensureBucketExists();

        // 1. Subir archivo a Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, req.file.buffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: req.file.mimetype || 'application/octet-stream'
            });

        if (uploadError) throw uploadError;

        // 2. Obtener URL pública
        const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        const imageUrl = publicData.publicUrl;

        // 3. Guardar en BD (product_images)
        const { data, error: dbError } = await supabase
            .from('product_images')
            .insert([{
                product_id: productId,
                image_url: imageUrl
            }])
            .select('id, product_id, image_url, created_at');

        if (dbError) throw dbError;

        return res.status(201).json({
            message: 'Imagen subida y guardada en BD correctamente.',
            image: data[0]
        });
    } catch (error) {
        console.error('Error al subir imagen y guardar en BD:', error);
        const status = error.status || error.statusCode || 500;
        const msg = error.message || 'Error desconocido.';
        return res.status(500).json({
            message: 'Error al subir imagen.',
            error: msg,
            bucket: BUCKET_NAME,
            status
        });
    }
};