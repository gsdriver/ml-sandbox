%% Logistic regression for slot machine
%

%% Initialization
clear ; close all; clc

fprintf('Loading Data ...\n')
data = load('matrix.txt');
X = data(:, 1:5); y = data(:, 6);
m = length(y); % number of training examples

