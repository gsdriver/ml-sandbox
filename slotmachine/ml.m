%% Logistic regression for slot machine
%

%% Initialization
clear ; close all; clc

fprintf('Loading Data ...\n')
data = load('matrix.txt');
[m, n] = size(data);
X = data(:, 1:n-1);
y = data(:, n);

%  Set options for fminunc
options = optimset('GradObj', 'on', 'MaxIter', 400);
initial_theta = zeros(n + 1, 1);

%  Run fminunc to obtain the optimal theta
%  This function will return theta and the cost
[theta, cost] = ...
    fminunc(@(t)(costFunction(t, X, y)), initial_theta, options);
