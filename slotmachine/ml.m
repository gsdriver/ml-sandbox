%% Logistic regression for slot machine
%

%% Initialization
clear ; close all; clc

fprintf('Loading Data ...\n')
data = load('spins.txt');
theta = logregress(data)

data = load('nospins.txt');
theta2 = logregress(data)
