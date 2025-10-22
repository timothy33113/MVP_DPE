# Debug - Parcelles Cadastrales

## Pour voir si ça fonctionne:

1. **Ouvrez la carte** : http://localhost:5174
2. **Ouvrez la console** (F12 → Console)
3. **Cliquez sur un point bleu** (une annonce)
4. Le panneau latéral devrait s'ouvrir à droite
5. **Cliquez sur le bouton "Voir cadastre"**

## Dans la console, vous devriez voir:

```
📊 Cadastre data: { success: true, data: { parcelles: [...] } }
✅ Trouvé X parcelle(s) - Surface totale: XXXXm²
🗺️  X parcelles cadastrales affichées
```

## Si vous ne voyez rien:

1. Vérifiez que le bouton "Voir cadastre" est bien visible dans le panneau latéral
2. Vérifiez qu'il n'y a pas d'erreurs dans la console (en rouge)
3. Vérifiez que les parcelles ont bien une `geometry` dans les données

## Pour vérifier manuellement:

Dans la console du navigateur, tapez:
```javascript
// Après avoir cliqué sur "Voir cadastre"
console.log(window.cadastreParcelles);
```

Vous devriez voir un tableau d'objets avec des propriétés `geometry`, `section`, `numero`, etc.
