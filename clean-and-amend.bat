@echo off
echo Nettoyage et amend du commit...

echo Suppression du fichier .js problématique...
del .js 2>nul

echo Ajout des fichiers au staging...
git add .

echo Amend du dernier commit...
git commit --amend --no-edit

echo Terminé !
pause 