/**
 * Created by Jordan on 21/11/14.
 */

// Load winston custom logger.
require('./config/winston');

// Load passport rules.
require('./config/passport');

// Load AWS parameters.
require('./config/aws');

// Load routes.
require('./routes');
