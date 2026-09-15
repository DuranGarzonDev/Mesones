import { fallbackNews } from '../config.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

export async function listPublishedNews() {
  if (!isSupabaseConfigured) return fallbackNews;

  const { data, error } = await supabase
    .from('articles')
    .select('id,title,excerpt,content,category,author_name,published_at,image_url,featured')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data.length ? data : fallbackNews;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase aún no está configurado.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await supabase
    .from('editor_profiles')
    .select('id,display_name,role,active')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile?.active) {
    await supabase.auth.signOut();
    throw new Error('La cuenta no tiene permisos editoriales.');
  }

  return { user: data.user, profile };
}

export async function getCurrentEditor() {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('editor_profiles')
    .select('id,display_name,role,active')
    .eq('id', user.id)
    .single();

  return profile?.active ? { user, profile } : null;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function requestPasswordReset(email) {
  if (!supabase) throw new Error('Supabase aún no está configurado.');
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password) {
  if (!supabase) throw new Error('Supabase aún no está configurado.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

async function optimizeImage(file) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen válido.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen no puede superar 8 MB.');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width, 1000 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
      'image/webp',
      0.84,
    );
  });
}

export async function publishArticle(values, imageFile, editor) {
  if (!supabase || !editor) throw new Error('Debes iniciar sesión como editor.');

  let imageUrl = null;
  let imagePath = null;
  const imageBlob = await optimizeImage(imageFile);

  if (imageBlob) {
    imagePath = `${editor.user.id}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(imagePath, imageBlob, { contentType: 'image/webp', upsert: false });
    if (uploadError) throw uploadError;
    imageUrl = supabase.storage.from('news-images').getPublicUrl(imagePath).data.publicUrl;
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({
      title: values.title,
      excerpt: values.excerpt,
      content: values.content,
      category: values.category,
      author_name: editor.profile.display_name,
      author_id: editor.user.id,
      image_url: imageUrl,
      image_path: imagePath,
      status: values.status,
      published_at: values.status === 'published' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    if (imagePath) await supabase.storage.from('news-images').remove([imagePath]);
    throw error;
  }
  return data;
}
