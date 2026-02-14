# !/bin/bash

# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y

# Generate SSH key and add to ssh-agent
ssh-keygen -t ed25519 -C "popofxxx@hotmail.com" -f ~/.ssh/id_ed25519 -N ""
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
echo ""
echo "===================================="
cat ~/.ssh/id_ed25519.pub
echo "===================================="
echo ""
echo "Add the above SSH key to GitHub."
echo "When done, run setup2.sh to continue the setup process."
