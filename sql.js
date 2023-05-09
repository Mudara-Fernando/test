
//	Invoices and client details in domain details page
//	Licenses by lead source

//	Revenue by lead source
//	Revenue by sales person
//

var sql = module.exports = {

//	-----------------------------------------------------------------------------
//	Get all Subscription Events (changes) for a given date (AUR, Suspended, Activated, New, Lost, etc..)
//	-----------------------------------------------------------------------------
	daySummery: function(ignorePlans, date, zoho_admin){
		return 'SELECT se.id, cus_id, domain, plan, code, seats_licensed AS seats, new_status,  '+//GREATEST(seats, seats_licensed)
					'(SELECT new_status '+
							'FROM subscription_event '+
							'WHERE subscr_id = se.subscr_id '+
							'AND id < se.id ORDER BY id DESC LIMIT 0, 1) AS prev_status, '+
					'(SELECT seats_licensed '+
							'FROM subscription_event '+
							'WHERE subscr_id = se.subscr_id '+
							'AND id < se.id ORDER BY id DESC LIMIT 0, 1) AS prev_seats '+
				'FROM subscription_event se '+
				'LEFT JOIN subscription su on su.id = se.subscr_id '+
				'LEFT JOIN customer c on c.id = su.cus_id '+
				'LEFT JOIN service s on s.id = su.service_id '+
				'WHERE zoho_admin = \''+zoho_admin+'\' '+
//				'AND plan NOT IN ('+ignorePlans+') '+
				//'AND event_time LIKE \''+date+'%\' '+
				'AND event_time = (SELECT MAX(event_time) FROM subscription_event) '+
				'ORDER BY se.id DESC';
	},

//	-----------------------------------------------------------------------------
//	Get Total License count for a month
//	-----------------------------------------------------------------------------
	licenseCount: function(ignoreServices, nextMonFDate) {
        return 'SELECT su.zoho_admin, s.plan, COUNT(*) AS subscriptions, SUM(seats) AS fixedLicenses, SUM(seats_licensed) AS licenses '+
				'FROM subscription_event se '+
				'LEFT JOIN subscription su on su.id = se.subscr_id '+
				'LEFT JOIN service s on s.id = su.service_id '+
				'LEFT JOIN customer c on c.id = su.cus_id '+
				'WHERE s.id NOT IN ('+ignoreServices+') '+
				'AND display = 1 AND new_status = \'ACTIVE\' '+
				'AND se.id = (SELECT MAX(id) FROM subscription_event '+
						'WHERE subscr_id = su.id '+
						'AND event_time < \''+nextMonFDate+'\') group by s.plan, su.zoho_admin ';
    },
    
    licenseCountNew: function() {
        return `
        SELECT final.zoho_admin, SUM(final.subscriptions) as subscriptions, SUM(final.licenses) as licenses 
        FROM ( SELECT sub.zoho_admin, serv.plan,
                ( CASE 
                    WHEN serv.plan = 'FLEXIBLE' THEN SUM(sub_e.seats_licensed) 
                    ELSE SUM(sub_e.seats)
                END ) as licenses,
                COUNT(sub.id) as subscriptions
        FROM subscription sub
        INNER JOIN
        ( SELECT
            *
        FROM
            subscription_event se
        WHERE
            event_time =(
            SELECT
                MAX(se.event_time)
            FROM
                subscription_event se
            WHERE
                event_time <= ?
        ) AND se.new_status = 'ACTIVE' AND subscr_id IN(
        SELECT
            s.id
        FROM
            subscription s
        WHERE
            s.service_id IN(
            SELECT
                ser.id
            FROM
                service ser
            WHERE
                ser.display = 1 AND ser.id NOT IN (?)
        )
        )) as sub_e
        ON sub.id = sub_e.subscr_id
        INNER JOIN service serv
        ON serv.id = sub.service_id
        GROUP BY sub.zoho_admin, serv.plan ) as final
        GROUP BY final.zoho_admin

        `
    },

//	-----------------------------------------------------------------------------
//	Get Total License count for all previous months.
//	-----------------------------------------------------------------------------
// 	licenseCountForAllMonths: function(ignorePlans, endDate, zoho_admin){
//         return 'SELECT * FROM ' +
//         '(SELECT SUM(seats_licensed) AS licenses,  DATE_FORMAT(event_time,"%Y-%m") as d1, ' +
//         'DATE_FORMAT(event_time,"%Y-%M") as d2 ' +
//         'FROM subscription_event se LEFT JOIN subscription su on su.id = se.subscr_id ' +
//         'LEFT JOIN service s on s.id = su.service_id LEFT JOIN customer c on c.id = su.cus_id ' +
//         'WHERE zoho_admin = \''+zoho_admin+'\' AND display = 1 AND new_status = \'ACTIVE\' '+
//         'AND se.id = (SELECT MAX(id) FROM subscription_event WHERE subscr_id = su.id ' +
//         'AND event_time < \''+endDate+'\') GROUP BY d1,d2 ORDER BY d1 DESC LIMIT 12) tb ' +
//         'ORDER BY d1 ASC';
// 	},

	licenseCountForAllMonths: function(ignoreServices, nextMonFDate, d1, d2, zoho_admin){
		return 'SELECT su.zoho_admin, s.plan, COUNT(*) AS subscriptions, SUM(seats) AS fixedLicenses, SUM(seats_licensed) AS licenses, '+
			'"'+d1+'" as d1, "'+d2+'" as d2 '+
			'FROM subscription_event se '+
			'LEFT JOIN subscription su on su.id = se.subscr_id '+
			'LEFT JOIN service s on s.id = su.service_id '+
			'LEFT JOIN customer c on c.id = su.cus_id '+
			'WHERE s.id NOT IN ('+ignoreServices+') '+
			'AND display = 1 AND new_status = \'ACTIVE\' '+
			'AND se.id = (SELECT MAX(id) FROM subscription_event '+
			'WHERE subscr_id = su.id '+
			'AND event_time < \''+nextMonFDate+'\') group by s.plan, su.zoho_admin ';
    },
    
    licenseCountForAllMonthsNew: function() {
        return `
        SELECT final.zoho_admin, SUM(final.licenses) as licenses, ? as d1, ? as d2
        FROM ( SELECT sub.zoho_admin, serv.plan,
                ( CASE 
                    WHEN serv.plan = 'FLEXIBLE' THEN SUM(sub_e.seats_licensed) 
                    ELSE SUM(sub_e.seats)
                END ) as licenses
        FROM subscription sub
        INNER JOIN
        ( SELECT
            *
        FROM
            subscription_event se
        WHERE
            event_time =(
            SELECT
                MAX(se.event_time)
            FROM
                subscription_event se
            WHERE
                event_time <= ?
        ) AND se.new_status = 'ACTIVE' AND subscr_id IN(
        SELECT
            s.id
        FROM
            subscription s
        WHERE
            s.service_id IN(
            SELECT
                ser.id
            FROM
                service ser
            WHERE
                ser.display = 1 AND ser.id NOT IN (?)
        )
        )) as sub_e
        ON sub.id = sub_e.subscr_id
        INNER JOIN service serv
        ON serv.id = sub.service_id
        GROUP BY sub.zoho_admin, serv.plan ) as final
        GROUP BY final.zoho_admin

        `;
    },

//	-----------------------------------------------------------------------------
//	Get Total Subscriptions and Licenses for a given month by SKU - regardless of plan
//	-----------------------------------------------------------------------------
	totalLicensesAllPlans: function(ignorePlans, nextMonFDate, zoho_admin){
		var fromClause = 'FROM subscription_event se '+
						'LEFT JOIN subscription su on su.id = se.subscr_id '+
						'LEFT JOIN customer c on c.id = su.cus_id '+
						'LEFT JOIN service s on s.id = su.service_id ';
		var whereClause = 'WHERE display = 1 AND new_status = \'ACTIVE\' AND zoho_admin = \''+zoho_admin+'\' '+
//						'AND plan NOT IN ('+ignorePlans+') '+
						'AND se.id = (SELECT MAX(id) FROM subscription_event '+
									'WHERE subscr_id = su.id '+
									'AND event_time < \''+nextMonFDate+'\') ';
		return 'SELECT code, color, SUM(seats_licensed) AS licenses '+
				fromClause+whereClause+
				'GROUP BY code '+
				'ORDER BY code';
	},

//	-----------------------------------------------------------------------------
//	Get Total Subscriptions and Licenses for a given month by SKU and plan
//	-----------------------------------------------------------------------------
	totalLicenses: function(ignoreServices, nextMonFDate, zoho_admin, filter){
		var fromClause = 'FROM subscription_event se '+
						'LEFT JOIN subscription su on su.id = se.subscr_id '+
						'LEFT JOIN customer c on c.id = su.cus_id '+
						'LEFT JOIN service s on s.id = su.service_id ';
		var whereClause = 'WHERE display = 1 AND new_status = \'ACTIVE\' AND zoho_admin = \''+zoho_admin+'\' '+
						'AND s.id NOT IN ('+ignoreServices+') '+
						'AND se.id = (SELECT MAX(id) FROM subscription_event '+
									'WHERE subscr_id = su.id '+
									'AND event_time < \''+nextMonFDate+'\') ';
		if (filter) {
		    var planFilter = 'viwo_plan = \'' + filter.plans[0] + '\' ';
		    for (var i = 1 ; i < filter.plans.length ; i++){
		        planFilter = planFilter + 'OR viwo_plan = \''  + filter.plans[i] + '\'';
            }
            return 'SELECT c.id, domain, plan, viwo_plan, su.order_id, s.code as product, s.id as product_id, seats_licensed AS licenses, seats AS fixedLicenses, cus_id '+
                fromClause+whereClause+
                'AND ('+ planFilter +') AND code = \''+filter.code+'\' '+
                'ORDER BY domain';//licenses DESC
        }

		else
			return 'SELECT plan, viwo_plan, code, skuName, color, COUNT(*) AS subscriptions, SUM(seats_licensed) AS licenses, SUM(seats) AS fixedLicenses '+
					fromClause+whereClause+
					'GROUP BY code ,viwo_plan, plan '+
					'ORDER BY code ,viwo_plan, plan';
	},

	//fundamental sql functions

	newSubscriptionLicenses : function (startDate, endDate, filter, ignoreServices) {
        var fromClause =  'FROM subscription_event se '+
            			  'LEFT JOIN subscription su ON su.id = se.subscr_id '+
             			  'LEFT JOIN customer c on c.id = su.cus_id '+
            			  'LEFT JOIN service s ON s.id = su.service_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status = \'ACTIVE\' '+
			              'AND se.id = (SELECT MAX(id) FROM subscription_event '+
                          'WHERE subscr_id = su.id AND event_time BETWEEN \''+ startDate +'\' AND \'' +
						   endDate + '\') AND s.id NOT IN ('+ignoreServices+') AND '+
                          'su.created_on BETWEEN \''+ startDate +'\' AND \'' + endDate + '\' ';

        if (filter){
            return 'SELECT c.id, c.domain, su.order_id, zoho_admin, (se.seats_licensed) AS licenses, (se.seats) as fixedLicenses,  cus_id '+
                fromClause+whereClause+
                'AND plan = \''+filter[0]+'\' AND code = \''+filter[1]+'\' '+
                'ORDER BY domain';
        }else
            return 'SELECT plan, viwo_plan, code, skuName, su.is_commitment, su.subscription_no, su.previous_plan, su.order_id, domain, c.id as cus_id, zoho_admin, service_id, color, COUNT(*) AS subscriptions ,SUM(se.seats) as fixedLicenses, SUM(se.seats_licensed) AS licenses '+
                fromClause+whereClause+
                'GROUP BY code, plan, zoho_admin, domain '+
                'ORDER BY plan, code, zoho_admin, domain'
    },

    licenseChangeForActiveSubscriptions : function (startDate, endDate, filter, ignoreServices) {
        var fromClause =  'FROM subscription_event se LEFT JOIN '+
            'subscription_event se_prev ON se_prev.id = '+
				'(SELECT MAX(id) FROM subscription_event WHERE '+
				'subscr_id = se.subscr_id AND event_time <= \'' + startDate + '\') '+
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status = \'ACTIVE\' '+
				'AND se_prev.new_status = \'ACTIVE\''+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time <= \''+ endDate +
			'\') AND se.seats_licensed != se_prev.seats_licensed ' +
            'AND s.id NOT IN ('+ignoreServices+') '+
            'AND ((se.seats != se_prev.seats) OR (se.seats = 0 AND se_prev.seats = 0)) ';

        if (filter){
            return 'SELECT c.id, c.domain, su.order_id, zoho_admin, (se.seats_licensed - se_prev.seats_licensed) AS licenses,(se.seats - se_prev.seats) as fixedLicenses, cus_id '+
                fromClause+whereClause+
                'AND plan = \''+filter[0]+'\' AND code = \''+filter[1]+'\' '+
                'ORDER BY domain';
        }else
            return 'SELECT plan, viwo_plan, domain, su.order_id, su.is_commitment, code, skuName, zoho_admin, c.id as cus_id, service_id, color, COUNT(*) AS subscriptions, SUM(se.seats - se_prev.seats) as fixedLicenses, SUM(se.seats_licensed - se_prev.seats_licensed) AS licenses '+
                fromClause+whereClause+
                'GROUP BY code, plan, zoho_admin, domain '+
                'ORDER BY plan, code, zoho_admin, domain'
    },

    licensechangeForSubscriptionChange : function (startDate, endDate, filter,ignoreServices) {
        var fromClause =  'FROM subscription_event se '+
            'LEFT JOIN subscription_event se_prev ON se_prev.id = ' +
			'(SELECT MAX(id) FROM subscription_event WHERE subscr_id = ' +
			'se.subscr_id AND event_time <=  \'' + startDate + '\') ' +
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status != se_prev.new_status '+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time <= \''+ endDate +'\') ' +
            'AND s.id NOT IN ('+ignoreServices+') ';

        if (filter){
            return 'SELECT c.id, c.domain, su.order_id, zoho_admin, se_prev.new_status AS previous_status, se.new_status AS current_status, (se.seats_licensed) AS licenses, (se.seats) as fixedLicenses, cus_id '+
                fromClause+whereClause+
                'AND plan = \''+filter[0]+'\' AND code = \''+filter[1]+'\' '+
                'ORDER BY domain';
        }else
            return 'SELECT plan, viwo_plan, domain, code, skuName, su.is_commitment, zoho_admin, c.id as cus_id, service_id,se.new_status AS current_status, se_prev.new_status as previous_status, ' +
				'color, COUNT(*) AS subscriptions, SUM(se.seats_licensed) AS licenses, (se.seats) as fixedLicenses '+
                fromClause+whereClause+
                'GROUP BY code, plan, zoho_admin, current_status, previous_status, domain '+
                'ORDER BY plan, code, zoho_admin, current_status, previous_status, domain'
    },


//	queries for lead source
    newSubscriptionLicensesByLead : function (startDate, endDate, filter, ignoreServices) {
        var fromClause =  'FROM subscription_event se '+
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ' +
            'LEFT JOIN zoho_domain za on za.domain = c.domain '+
            'LEFT JOIN zoho_lead_source zls on zls.id = za.lead_source_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status = \'ACTIVE\' '+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time BETWEEN \''+ startDate +'\' AND \'' +
            endDate + '\') AND s.id NOT IN ('+ignoreServices+') AND ' +
            'su.created_on BETWEEN \''+ startDate +'\' AND \'' + endDate + '\' ';

        if (filter){
            return 'SELECT c.id, c.domain, su.order_id, s.code, s.plan, s.id as product_id, zoho_admin, (se.seats_licensed) AS licenses, (se.seats) as fixedLicenses, cus_id '+
                fromClause+whereClause+
                'AND zls.id = \''+filter+'\' '+
                'ORDER BY domain';
        }else
            return 'SELECT zls.id, s.code, s.skuName, s.plan, s.viwo_plan, c.domain, su.subscription_no, su.previous_plan,  c.id as cus_id, s.id as product_id, description, zoho_admin, COUNT(*) AS subscriptions, SUM(se.seats_licensed) AS licenses, SUM(se.seats) as fixedLicenses '+
                fromClause+whereClause+
                'GROUP BY description, zoho_admin, s.code, c.domain '+
                'ORDER BY description, zoho_admin '
    },

    licenseChangeForActiveSubscriptionsByLead : function (startDate, endDate, filter, ignoreServices) {
        var fromClause =  'FROM subscription_event se LEFT JOIN '+
            'subscription_event se_prev ON se_prev.id = '+
            '(SELECT MAX(id) FROM subscription_event WHERE '+
            'subscr_id = se.subscr_id AND event_time <= \'' + startDate + '\') '+
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ' +
            'LEFT JOIN zoho_domain za on za.domain = c.domain '+
            'LEFT JOIN zoho_lead_source zls on zls.id = za.lead_source_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status = \'ACTIVE\' '+
            'AND se_prev.new_status = \'ACTIVE\''+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time <= \''+ endDate +
            '\') AND se.seats_licensed != se_prev.seats_licensed ' +
            'AND s.id NOT IN ('+ignoreServices+') ' +
            'AND ((se.seats != se_prev.seats) OR (se.seats = 0 AND se_prev.seats = 0)) ';

        if (filter){
            return 'SELECT c.id, c.domain, su.order_id, s.code, s.plan, s.id as product_id, zoho_admin, (se.seats_licensed - se_prev.seats_licensed) AS licenses, (se.seats - se_prev.seats) as fixedLicenses, cus_id '+
                fromClause+whereClause+
                'AND zls.id = \''+filter+'\' '+
                'ORDER BY domain';
        }else
            return 'SELECT zls.id , s.code, s.skuName, s.plan, s.viwo_plan, c.id as cus_id, s.id as product_id, c.domain, description, zoho_admin, COUNT(*) AS subscriptions, SUM(se.seats_licensed - se_prev.seats_licensed) AS licenses, SUM(se.seats - se_prev.seats) as fixedLicenses '+
                fromClause+whereClause+
                'GROUP BY description, zoho_admin, s.code, c.domain '+
                'ORDER BY description, zoho_admin'
    },

    licensechangeForSubscriptionChangeByLead : function (startDate, endDate, filter, ignoreServices) {
        var fromClause =  'FROM subscription_event se '+
            'LEFT JOIN subscription_event se_prev ON se_prev.id = ' +
            '(SELECT MAX(id) FROM subscription_event WHERE subscr_id = ' +
            'se.subscr_id AND event_time <=  \'' + startDate + '\') ' +
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ' +
            'LEFT JOIN zoho_domain za on za.domain = c.domain '+
            'LEFT JOIN zoho_lead_source zls on zls.id = za.lead_source_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status != se_prev.new_status '+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time <= \''+ endDate +'\') ' +
            'AND s.id NOT IN ('+ignoreServices+') ';

        if (filter){ // now not used
            return 'SELECT c.id, c.domain, su.order_id, s.code, s.plan, s.id as product_id, zoho_admin, se_prev.new_status AS previous_status, se.new_status AS current_status, (se.seats_licensed) AS licenses, (se.seats) as fixedLicenses, cus_id '+
                fromClause+whereClause+
                'AND zls.id = \''+filter+'\' '+
                'ORDER BY domain';
        }else
            return 'SELECT zls.id, s.code, s.skuName, s.plan, s.viwo_plan, c.id as cus_id, s.id as product_id, c.domain, description, zoho_admin, se.new_status AS current_status, se_prev.new_status as previous_status, ' +
                'COUNT(*) AS subscriptions, SUM(se.seats_licensed) AS licenses, (se.seats) as fixedLicenses '+
                fromClause+whereClause+
                'GROUP BY description, zoho_admin, current_status, previous_status, s.code, c.domain '+
                'ORDER BY description, zoho_admin, current_status, previous_status'
    },

//queries for by-salesperson

    //	queries for lead source
    newSubscriptionLicensesBySales : function (startDate, endDate, filter, ignoreServices, productId) {
        var fromClause =  'FROM subscription_event se '+
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ' +
            'LEFT JOIN zoho_domain za on za.domain = c.domain '+
            'LEFT JOIN zoho_user zu ON zu.id = za.creator_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status = \'ACTIVE\' '+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time BETWEEN \''+ startDate +'\' AND \'' +
            endDate + '\') AND s.id NOT IN ('+ignoreServices+') AND ' +
            'su.created_on BETWEEN \''+ startDate +'\' AND \'' + endDate + '\' ';

        if (filter != "null") {
            if (filter) {
                return 'SELECT c.id, c.domain, su.order_id, s.code, s.id as product_id, zoho_admin, (se.seats_licensed) AS licenses, cus_id ' +
                    fromClause + whereClause +
                    'AND fullname = \'' + filter.replace(/-/g, ' ') + '\' ' +
                    'ORDER BY domain';
            } else {
                return 'SELECT fullname,s.code, c.domain, zoho_admin, COUNT(*) AS subscriptions, SUM(se.seats_licensed) AS licenses ' +
                    fromClause + whereClause +
                    'GROUP BY fullname, zoho_admin, s.code, c.domain ' +
                    'ORDER BY fullname, zoho_admin '
            }
        } else {
            return 'SELECT c.id, c.domain, su.order_id, s.code, s.id as product_id, zoho_admin, (se.seats_licensed) AS licenses, cus_id '+
                fromClause+whereClause+
                'AND fullname IS NULL '+
                'ORDER BY domain';
        }
    },

    licenseChangeForActiveSubscriptionsBySales : function (startDate, endDate, filter, ignoreServices, productId) {
        var fromClause =  'FROM subscription_event se LEFT JOIN '+
            'subscription_event se_prev ON se_prev.id = '+
            '(SELECT MAX(id) FROM subscription_event WHERE '+
            'subscr_id = se.subscr_id AND event_time <= \'' + startDate + '\') '+
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ' +
            'LEFT JOIN zoho_domain za on za.domain = c.domain '+
            'LEFT JOIN zoho_user zu ON zu.id = za.creator_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status = \'ACTIVE\' '+
            'AND se_prev.new_status = \'ACTIVE\''+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time <= \''+ endDate +
            '\') AND se.seats_licensed != se_prev.seats_licensed ' +
            'AND s.id NOT IN ('+ignoreServices+') ' +
            'AND ((se.seats != se_prev.seats) OR (se.seats = 0 AND se_prev.seats = 0)) ';


        if (filter != "null") {
            if (filter) {
                return 'SELECT c.id, c.domain, su.order_id, s.code, s.id as product_id, zoho_admin, (se.seats_licensed - se_prev.seats_licensed) AS licenses, cus_id ' +
                    fromClause + whereClause +
                    'AND fullname = \'' + filter.replace(/-/g, ' ') + '\' ' +
                    'ORDER BY domain';
            } else {
                return 'SELECT fullname, s.code, c.domain, zoho_admin, COUNT(*) AS subscriptions, SUM(se.seats_licensed - se_prev.seats_licensed) AS licenses ' +
                    fromClause + whereClause +
                    'GROUP BY fullname, zoho_admin, s.code, c.domain ' +
                    'ORDER BY fullname, zoho_admin '
            }
        } else {
            return 'SELECT c.id, c.domain, su.order_id, s.code, s.id as product_id, zoho_admin, (se.seats_licensed - se_prev.seats_licensed) AS licenses, cus_id '+
                fromClause+whereClause+
                'AND fullname IS NULL '+
                'ORDER BY domain';
        }
    },

    licensechangeForSubscriptionChangeBySales : function (startDate, endDate, filter, ignoreServices, productId) {
        var fromClause =  'FROM subscription_event se '+
            'LEFT JOIN subscription_event se_prev ON se_prev.id = ' +
            '(SELECT MAX(id) FROM subscription_event WHERE subscr_id = ' +
            'se.subscr_id AND event_time <=  \'' + startDate + '\') ' +
            'LEFT JOIN subscription su ON su.id = se.subscr_id '+
            'LEFT JOIN customer c on c.id = su.cus_id '+
            'LEFT JOIN service s ON s.id = su.service_id ' +
            'LEFT JOIN zoho_domain za on za.domain = c.domain '+
            'LEFT JOIN zoho_user zu ON zu.id = za.creator_id ';

        var whereClause = 'WHERE display = 1 AND se.new_status != se_prev.new_status '+
            'AND se.id = (SELECT MAX(id) FROM subscription_event '+
            'WHERE subscr_id = su.id AND event_time <= \''+ endDate +'\') ' +
            'AND s.id NOT IN ('+ignoreServices+') ';

        if (filter != "null") {
            if (filter) {
                return 'SELECT c.id, c.domain, su.order_id, s.code, s.id as product_id, zoho_admin, se.new_status AS current_status, se_prev.new_status as previous_status, (se.seats_licensed) AS licenses, cus_id ' +
                    fromClause + whereClause +
                    'AND fullname = \'' + filter.replace(/-/g, ' ') + '\' ' +
                    'ORDER BY domain';
            } else {
                return 'SELECT fullname,s.code, c.domain, zoho_admin, se.new_status AS current_status, se_prev.new_status as previous_status, COUNT(*) AS subscriptions, SUM(se.seats_licensed) AS licenses ' +
                    fromClause + whereClause +
                    'GROUP BY fullname, zoho_admin, current_status, previous_status, s.code, c.domain ' +
                    'ORDER BY fullname, zoho_admin, current_status, previous_status '
            }
        } else {
            return 'SELECT c.id, c.domain, su.order_id, s.code, s.id as product_id, zoho_admin, se.new_status AS current_status, se_prev.new_status as previous_status, (se.seats_licensed) AS licenses, cus_id '+
                fromClause+whereClause+
                'AND fullname IS NULL '+
                'ORDER BY domain';
        }
    },

//  -----------------------------------------------------------------------------
//	Get Total Revenue upto now
//	-----------------------------------------------------------------------------
	totalRevenueCount: function(ignorePlans, end_date){
		return 'SELECT COUNT(*) AS sold, SUM(total) AS revenue '+
			'FROM zohobooks_invoice inv '+
			'LEFT JOIN zohobooks_contact con on con.contact_id = inv.customer_id '+
			'WHERE (inv.date < "'+end_date+'")';
	},


//	-----------------------------------------------------------------------------
//	Get Total Revenue for a month
//	-----------------------------------------------------------------------------
	revenueCount: function(ignorePlans, month_start, month_end, invoice_list){
		if (invoice_list)
			return 'SELECT invoice_number, contact_name, zi.status, zi.date, total, balance, (total-balance) as paid '+
				'FROM zohobooks_invoice zi '+
				'LEFT JOIN zohobooks_contact zbc ON zbc.contact_id = zi.customer_id '+
				'WHERE zi.date BETWEEN "'+month_start+'" AND "'+month_end+'"'+
                'AND zi.status NOT IN (\'void\') '+
				'ORDER BY date DESC;'
		else
			return 'SELECT COUNT(*) AS sold, SUM(total) AS revenue, SUM(balance) as balance, SUM(total-balance) as paid_amount '+
				'FROM zohobooks_invoice inv '+
				'LEFT JOIN zohobooks_contact con on con.contact_id = inv.customer_id '+
				'WHERE inv.date BETWEEN "'+month_start+'" AND "'+month_end+'"'+
                'AND inv.status NOT IN (\'void\') ';
	},

//	-----------------------------------------------------------------------------
//	Get Revenue By Salesperson
//	-----------------------------------------------------------------------------
	revenueBySalesperson: function(ignorePlans, nextMonFDate, thisMonFDate, filter){
        var fromWhereClause =
            'FROM (SELECT '+(filter ? 'invoice_number, contact_name, nci.status, nci.date, total, balance ' : 'zu.id, fullname, total, balance ')+
                    'FROM new_customer_invoice nci '+
                    'LEFT JOIN zohobooks_contact zc ON zc.contact_id = nci.customer_id '+
                    'LEFT JOIN zoho_account za ON za.id = zc.zcrm_account_id '+
                    'LEFT JOIN zoho_user zu ON zu.id = za.creator_id '+
            'WHERE nci.status NOT IN (\'draft\', \'void\') AND nci.date >= \''+thisMonFDate+'\' AND nci.date < \''+nextMonFDate+'\''+
            (filter ? ' AND zu.id = '+filter : '')+
            ') AS tmp ';
		if (filter)
			return 'SELECT invoice_number, contact_name, status, date, total, balance, (total-balance) as paid '+
					fromWhereClause+
					'ORDER BY date DESC;'
		else
			return 'SELECT id, fullname, COUNT(*) AS invoices, SUM(total) AS revenue, SUM(balance) as balance, SUM(total-balance) as paid_amount '+
					fromWhereClause+
					'GROUP BY fullname ORDER BY revenue DESC;'
	},

//	-----------------------------------------------------------------------------
//	Get Revenue By Lead Source
//	-----------------------------------------------------------------------------
	revenueByLeadSource: function(ignorePlans, nextMonFDate, thisMonFDate, filter){
        var fromWhereClause =
					'FROM zohobooks_invoice zbi '+
					'LEFT JOIN zohobooks_contact zbc ON zbc.contact_id = zbi.customer_id '+
					'LEFT JOIN zoho_account za ON za.id = zbc.zcrm_account_id '+
					'LEFT JOIN zoho_lead_source zls on zls.id = za.lead_source_id '+
					'WHERE zbi.status NOT IN (\'draft\', \'void\') AND zbi.date BETWEEN \''+thisMonFDate+'\' AND \''+nextMonFDate+'\' ';
		if (filter)
			return 'SELECT invoice_number, contact_name, zbi.status, zbi.date, total, balance, (total-balance) as paid '+
				fromWhereClause+
				'AND zls.id = '+filter+
				' ORDER BY date DESC';
		else
			return 'SELECT zls.id, zls.description AS fullname, COUNT(*) AS invoices, SUM(total) AS revenue, SUM(balance) as balance, SUM(total-balance) as paid_amount '+
				fromWhereClause+
				'GROUP BY description ORDER BY revenue DESC';
	},

//	-----------------------------------------------------------------------------
//	Domain Details (products and licenses) of a selected domain
//	-----------------------------------------------------------------------------
	domainDetails: function(domain){
		return 'SELECT * '+
				'FROM zoho_domain '+
				'WHERE domain = \''+domain+'\'';
	},
	domainSubscriptions: function(cus_id, start_date, end_date, product_id){
		return 'SELECT se.id, event_time, zoho_admin, code, skuName, plan, viwo_plan, start_date, end_date, new_status, seats_licensed AS flexible, seats AS fixed '+
				'FROM subscription_event se '+
				'LEFT JOIN subscription sb ON sb.id = se.subscr_id '+
				'LEFT JOIN service srv ON srv.id = sb.service_id '+
				'WHERE cus_id = '+cus_id+' AND sb.service_id = '+ product_id +
                ' AND event_time BETWEEN \''+
                 start_date + '\' AND \'' + end_date + '\' ' +
				'ORDER BY event_time ASC';
	},
	domainInvoices: function(domain, start_date, end_date, salesPerson, product_id){

		return 'SELECT invoice_number, zbi.status, zbi.date, due_date, is_viewed_by_client, total, balance, zbi.last_modified_time '+
				'FROM zohobooks_invoice zbi '+
				'LEFT JOIN zohobooks_contact zbc ON zbc.contact_id = zbi.customer_id '+
				'LEFT JOIN zoho_account za ON za.id = zbc.zcrm_account_id '+
                'LEFT JOIN customer cu ON cu.domain = za.domain ' +
                'LEFT JOIN subscription su ON su.cus_id = cu.id '+
				'WHERE su.service_id = '+ product_id + ' AND ' +
                'za.domain = \''+domain+'\' '+ 'AND zbi.date BETWEEN \''+start_date+'\' AND \''+end_date+'\'' +
				'ORDER BY zbi.date DESC';
	},

	//---------------------------------------------------------------------------------------
	// Vivo panel page
	//---------------------------------------------------------------------------------------
	vivoPanel: function () {
        return 'SELECT viwo_panel.`id` AS `subsid`, viwo_panel.`domain`, `viwo_panel`.`code`, DATE_FORMAT(`viwo_panel`.`createdDate`,"%Y-%m-%d") AS created_on,  `viwo_panel`.`planType` AS `plan`, DATE_FORMAT(DATE_SUB(`viwo_panel`.`expires`,INTERVAL 1 DAY), "%Y-%m-%d") AS end_date, `viwo_panel`.`purchasedLicense` AS `seats_licensed`, `viwo_panel`.`maxNoSeats` AS `seats_max`, `viwo_panel`.`isTrial` AS `is_trial`, DATE_FORMAT(`viwo_panel`.`trailExpires`,"%Y-%m-%d") AS trial_end_date, `viwo_panel`.`renewalType` AS `renew_type`,`viwo_panel`.`zohoAdmin` AS `zoho_admin` from `viwo_panel`';
    },

    lastCron:function () {
		return 'SELECT MAX(`cron_start_time`) AS max_date FROM `http_requests`';
    },

    panelStatus:function () {
        return 'SELECT account_name, manual_update FROM `panel_metadata`';
    }

}
