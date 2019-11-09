function theta = logregress(data)

% Build our feature matrix and output vector
[m, n] = size(data);
X = data(:, 1:n-1);
y = data(:, n);
n = n - 1;

%  Set options for fminunc
options = optimset('GradObj', 'on', 'MaxIter', 400);
initial_theta = zeros(n + 1, 1);
X = [ones(m,1) X];

%  Run fminunc to obtain the optimal theta
%  This function will return theta and the cost
[theta, cost] = ...
    fminunc(@(t)(costFunction(t, X, y)), initial_theta, options);
end
