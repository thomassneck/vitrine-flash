// src/lib/articlesApi.js

export async function ajouterArticle(formData, boutiqueId, motDePasse) {
  const response = await fetch("/api/articles/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      boutiqueId,
      motDePasse,
      titre: formData.titre,
      description: formData.description || "",
      prix: formData.prix,
      imageUrl: formData.imageUrl || "",
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erreur lors de la création de l'article");
  }

  return result.article;
}

export async function supprimerArticle(articleId, boutiqueId, motDePasse) {
  const confirmation = window.confirm("Confirmer la suppression de cet article ?");
  if (!confirmation) return false;

  const response = await fetch("/api/articles/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      articleId,
      boutiqueId,
      motDePasse,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erreur lors de la suppression");
  }

  return true;
}