# 🍺 Beer Tracker

Una web app per registrare e valutare le birre bevute, con profili utente individuali.

## 🚀 Setup Rapido (30 minuti)

### 1. Setup Supabase Database

#### 1.1 Crea il progetto
1. Vai su [supabase.com](https://supabase.com)
2. Clicca "New Project"
3. Nome progetto: `beer-tracker`
4. Scegli una password forte per il database
5. Clicca "Create new project" (attendi 1-2 minuti)

#### 1.2 Crea le tabelle
1. Vai su "SQL Editor" nella sidebar sinistra
2. Clicca "New Query"
3. Copia e incolla questo codice SQL:

```sql
-- Abilita Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Tabella profili utenti
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS sulla tabella profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy per i profili: gli utenti possono vedere e modificare solo il proprio profilo
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Tabella birre
CREATE TABLE beers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brewery TEXT NOT NULL,
  style TEXT NOT NULL,
  alcohol_percentage DECIMAL(3,1),
  consumption_date DATE,
  location TEXT,
  price DECIMAL(10,2),
  photo_url TEXT,
  notes TEXT,
  rating_appearance INTEGER CHECK (rating_appearance >= 1 AND rating_appearance <= 5),
  rating_aroma INTEGER CHECK (rating_aroma >= 1 AND rating_aroma <= 5),
  rating_taste INTEGER CHECK (rating_taste >= 1 AND rating_taste <= 5),
  rating_drinkability INTEGER CHECK (rating_drinkability >= 1 AND rating_drinkability <= 5),
  rating_overall DECIMAL(2,1) GENERATED ALWAYS AS (
    CASE 
      WHEN rating_appearance IS NOT NULL AND rating_aroma IS NOT NULL 
           AND rating_taste IS NOT NULL AND rating_drinkability IS NOT NULL
      THEN (rating_appearance + rating_aroma + rating_taste + rating_drinkability) / 4.0
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS sulla tabella beers
ALTER TABLE beers ENABLE ROW LEVEL SECURITY;

-- Policy per le birre: gli utenti possono gestire solo le proprie birre
CREATE POLICY "Users can view own beers" ON beers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own beers" ON beers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own beers" ON beers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own beers" ON beers
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per creare automaticamente il profilo quando si registra un utente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'username', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger che si attiva quando viene creato un nuovo utente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Clicca "RUN" (in basso a destra)
5. Se vedi "Success. No rows returned" significa che è andato tutto bene!

#### 1.3 Ottieni le chiavi API
1. Vai su "Settings" → "API" nella sidebar
2. Copia questi due valori:
   - **Project URL** (es: `https://abcdefgh.supabase.co`)
   - **anon public** key (lunga stringa che inizia con `eyJ...`)

### 2. Setup GitHub Repository

#### 2.1 Crea il repository
1. Vai su [github.com](https://github.com)
2. Clicca il pulsante "+" in alto a destra → "New repository"
3. Nome repository: `beer-tracker`
4. Seleziona "Public"
5. Clicca "Create repository"

#### 2.2 Carica i file

**Opzione A - GitHub Desktop (raccomandato per principianti):**
1. Scarica [GitHub Desktop](https://desktop.github.com/)
2. Clona il repository vuoto sul tuo computer
3. Copia tutti i file dell'app nella cartella del repository
4. Modifica il file `config.js` inserendo le tue chiavi Supabase
5. Commit e push con GitHub Desktop

**Opzione B - Web Interface:**
1. Nel tuo repository GitHub, clicca "uploading an existing file"
2. Trascina tutti i file (index.html, style.css, script.js, config.js, package.json, README.md)
3. Prima di fare commit, clicca su `config.js` e modifica:
   ```javascript
   const supabaseUrl = 'LA_TUA_PROJECT_URL';
   const supabaseKey = 'LA_TUA_ANON_KEY';
   ```
4. Commit changes

### 3. Setup Vercel (Deploy automatico)

#### 3.1 Connetti GitHub a Vercel
1. Vai su [vercel.com](https://vercel.com)
2. Clicca "Sign up" → "Continue with GitHub"
3. Autorizza Vercel ad accedere ai tuoi repository

#### 3.2 Deploy l'app
1. Nella dashboard Vercel, clicca "New Project"
2. Trova il repository "beer-tracker" e clicca "Import"
3. Lascia tutte le impostazioni di default
4. Clicca "Deploy"
5. Attendi 1-2 minuti per il deploy

#### 3.3 Ottieni l'URL della tua app
1. Una volta completato il deploy, Vercel ti mostrerà l'URL
2. Sarà qualcosa come: `https://beer-tracker-username.vercel.app`
3. Clicca sull'URL per testare la tua app!

### 4. Configurazione finale Supabase

#### 4.1 Aggiungi il dominio Vercel
1. Torna su Supabase → Settings → Authentication
2. Scroll fino a "Site URL"
3. Aggiungi il tuo URL Vercel (es: `https://beer-tracker-username.vercel.app`)
4. In "Additional Redirect URLs" aggiungi lo stesso URL
5. Clicca "Save"

## ✅ Test della App

1. Apri il tuo URL Vercel
2. Registra un nuovo account
3. Controlla la tua email per confermare (se richiesto)
4. Fai login
5. Aggiungi la tua prima birra!

## 🔧 Personalizzazioni Facili

### Cambiare i colori
Modifica le variabili CSS in `style.css`:
```css
:root {
    --gold: #FFD700;        /* Colore oro principale */
    --amber: #FFBF00;       /* Colore ambra */
    --brown: #8B4513;       /* Colore marrone */
}
```

### Aggiungere nuovi stili di birra
Modifica i dropdown in `index.html` cercando le `<option>`:
```html
<option value="TuoNuovoStile">Tuo Nuovo Stile</option>
```

### Modificare il titolo
Cambia il titolo in `index.html`:
```html
<title>Il Mio Beer Tracker Personalizzato</title>
```

## 🚨 Troubleshooting

### Errore "Invalid API key"
- Controlla che hai copiato correttamente URL e chiave da Supabase
- Verifica che non ci siano spazi extra nel file `config.js`

### Errore di registrazione
- Vai su Supabase → Authentication → Settings
- Controlla che "Enable email confirmations" sia configurato come preferisci

### L'app non si carica
- Apri gli strumenti sviluppatore (F12) e controlla la console per errori
- Verifica che tutti i file siano stati caricati su GitHub

### Le birre non si salvano
- Controlla che le policy RLS siano attive in Supabase
- Verifica di essere loggato correttamente

## 📱 Funzionalità

✅ **Autenticazione sicura** - Login/registrazione con email  
✅ **Profili individuali** - Ogni utente vede solo le proprie birre  
✅ **Registrazione completa** - Nome, birrificio, stile, gradazione, prezzo, note  
✅ **Sistema valutazioni** - Aspetto, aroma, sapore, bevibilità (1-5 stelle)  
✅ **Statistiche personali** - Totale birre, voto medio, stile preferito, spesa  
✅ **Filtri e ordinamento** - Per stile, data, voto, nome  
✅ **Design responsive** - Funziona su mobile e desktop  
✅ **Sicurezza database** - Row Level Security attivata  

## 💰 Costi

- **Supabase**: Gratuito fino a 500MB database e 50k utenti
- **Vercel**: Gratuito per progetti personali
- **GitHub**: Gratuito per repository pubblici

**Totale: €0 per uso personale!**

## 🔄 Aggiornamenti futuri

Per aggiornare l'app:
1. Modifica i file nel tuo repository GitHub
2. Vercel si aggiorna automaticamente

## 📞 Supporto

Se hai problemi:
1. Controlla la sezione Troubleshooting sopra
2. Verifica che hai seguito tutti i passaggi
3. Controlla gli errori nella console del browser (F12)

Buona degustazione! 🍻