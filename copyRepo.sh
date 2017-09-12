#!/bin/bash
export USER=test
git clone --bare git@github.com:builtforme/battleship.git && cd battleship.git && git push --mirror git@github.com:builtforme/battleship-${USER}.git && rm -rf battleship.git
